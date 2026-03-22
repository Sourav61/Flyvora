require("dotenv").config();

const baseUrl = process.env.API_BASE_URL || "http://localhost:5000";
const timestamp = Date.now();
const email = `phase1_${timestamp}@example.com`;
const password = "password123";

const sendRequest = async (path, options) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(body)}`);
  }

  return body;
};

const run = async () => {
  const registerResponse = await sendRequest("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Phase 1 Test User",
      email,
      password,
    }),
  });

  const loginResponse = await sendRequest("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const profileResponse = await sendRequest("/api/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${loginResponse.token}`,
    },
  });

  console.log(
    JSON.stringify(
      {
        register: {
          userId: registerResponse.user.id,
          email: registerResponse.user.email,
          hasToken: Boolean(registerResponse.token),
        },
        login: {
          userId: loginResponse.user.id,
          email: loginResponse.user.email,
          hasToken: Boolean(loginResponse.token),
        },
        tokenCheck: profileResponse,
      },
      null,
      2
    )
  );
};

run().catch((error) => {
  console.error("Auth flow test failed:", error.message);
  process.exit(1);
});
