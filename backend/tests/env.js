// Test environment: no real secrets, ML service and Cloudinary are mocked per test file
process.env.JWT_SECRET = "test-secret";
process.env.ML_SERVICE_URL = "http://ml.test";
delete process.env.LLM_API_KEY;
