const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  create: jest.fn(function () {
    return mockAxios;
  }),
};

export default mockAxios;

