import assert from 'node:assert/strict'
import test from 'node:test'
import {
  APPLICATION_INSIGHTS,
  parseConnectionString,
  resetTelemetryForTests,
  trackAppStartup,
} from '../apps/web/src/app/telemetry.js'

test('parseConnectionString extracts instrumentationKey and ingestionUrl', () => {
  const result = parseConnectionString(
    'InstrumentationKey=11111111-2222-3333-4444-555555555555;IngestionEndpoint=https://northeurope-2.in.applicationinsights.azure.com/',
  )
  assert.equal(result.instrumentationKey, '11111111-2222-3333-4444-555555555555')
  assert.equal(
    result.ingestionUrl,
    'https://northeurope-2.in.applicationinsights.azure.com/v2/track',
  )
})

test('parseConnectionString rejects connection strings missing required fields', () => {
  assert.throws(
    () => parseConnectionString('IngestionEndpoint=https://example.com/'),
    /Application Insights connection string is invalid/,
  )
  assert.throws(
    () => parseConnectionString('InstrumentationKey=12345'),
    /Application Insights connection string is invalid/,
  )
})

test('APPLICATION_INSIGHTS default configuration is valid', () => {
  assert.equal(APPLICATION_INSIGHTS.instrumentationKey, '57d6037c-32f2-4e33-8afc-9bca358e1edc')
  assert.equal(
    APPLICATION_INSIGHTS.ingestionUrl,
    'https://northeurope-2.in.applicationinsights.azure.com/v2/track',
  )
})

test('trackAppStartup sends a valid Application Insights event envelope and deduplicates', async () => {
  resetTelemetryForTests()

  const requests: { url: string; options: RequestInit }[] = []
  const mockFetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), options: init ?? {} })
    return new Response(JSON.stringify({ itemsReceived: 1, itemsAccepted: 1 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  await trackAppStartup({
    fetcher: mockFetcher,
    version: '1.4.1',
    locale: 'en-US',
    platform: 'test-platform',
  })

  assert.equal(requests.length, 1)
  const req = requests[0]
  assert.equal(req.url, APPLICATION_INSIGHTS.ingestionUrl)
  assert.equal(req.options.method, 'POST')

  const parsedBody = JSON.parse(String(req.options.body))
  assert.equal(parsedBody.iKey, APPLICATION_INSIGHTS.instrumentationKey)
  assert.equal(parsedBody.tags?.['ai.application.ver'], '1.4.1')
  assert.ok(parsedBody.tags?.['ai.user.id'])
  assert.equal(parsedBody.data?.baseType, 'EventData')
  assert.equal(parsedBody.data?.baseData?.name, 'app.startup')
  assert.equal(parsedBody.data?.baseData?.properties?.appName, 'MagnetPlayer')
  assert.equal(parsedBody.data?.baseData?.properties?.version, '1.4.1')
  assert.equal(parsedBody.data?.baseData?.properties?.platform, 'test-platform')
  assert.equal(parsedBody.data?.baseData?.properties?.locale, 'en-US')

  // Calling it again on the same page load should be deduplicated
  await trackAppStartup({
    fetcher: mockFetcher,
  })
  assert.equal(requests.length, 1)

  // After reset, calling it should send again
  resetTelemetryForTests()
  await trackAppStartup({
    fetcher: mockFetcher,
    version: '1.4.1',
    locale: 'en-US',
    platform: 'test-platform',
  })
  assert.equal(requests.length, 2)
})
