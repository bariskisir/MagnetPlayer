// APIBay caps results at 100 per query. These internal partitions let broad searches collect more.
export const PIRATEBAY_SEARCH_PARTITIONS = [
  { id: 100, children: [101, 102, 103, 104, 199] },
  { id: 200, children: [201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 299] },
  { id: 300, children: [301, 302, 303, 304, 305, 306, 399] },
  { id: 400, children: [401, 402, 403, 404, 405, 406, 407, 408, 499] },
  { id: 500, children: [501, 502, 503, 504, 505, 506, 507, 599] },
  { id: 600, children: [601, 602, 603, 604, 605, 699] },
] as const
