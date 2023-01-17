import { NodeDef } from "node-red";

type AuthType = "anonymous" | "email" | "privateKey";

type DatabaseConfigType = NodeDef & {
  authType: AuthType;
  createUser?: boolean;
  name: string;
};

export default DatabaseConfigType;
