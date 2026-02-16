import { client } from "@/lib/openapi-client/client.gen";

const configureClient = () => {
  const baseURL = process.env.API_BASE_URL;

  client.setConfig({
    baseUrl: baseURL,
  });
};

configureClient();
