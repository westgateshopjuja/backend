import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";

import http from "http";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import resolvers from "../resolvers.js";
import typeDefs from "../typeDefs.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();

const httpServer = http.createServer(app);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

mongoose.Promise = global.Promise;

const connection = mongoose.connect(process.env.DB, {
  useNewUrlParser: true,
});

connection
  .then((db) => console.log("DB connected"))
  .catch((err) => {
    console.log(err);
  });

await server.start();

app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());
app.use(expressMiddleware(server));

export default httpServer;
