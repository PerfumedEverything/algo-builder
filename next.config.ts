import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["tinkoff-invest-api", "@grpc/grpc-js", "nice-grpc", "protobufjs"],
};

export default nextConfig;
