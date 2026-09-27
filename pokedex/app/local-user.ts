// This Docker installation owns one local collection. Client headers never select a user.
export async function getLocalUser() { return { userId: "local" }; }
