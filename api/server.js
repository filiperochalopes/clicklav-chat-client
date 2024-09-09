import { createServer } from 'node:http'
import { createYoga } from 'graphql-yoga'
import { schema } from './schema.js'
import { useServer } from 'graphql-ws/lib/use/ws'
import { WebSocketServer } from 'ws'
import express from 'express';
import { createPubSub } from '@graphql-yoga/subscription';


// Create express instance
const app = express();

const pubSub = createPubSub();

// Create a Yoga instance with a GraphQL schema.
const yoga = createYoga({ schema,
  graphqlEndpoint: '/api/v1/graphql',
  maskedErrors: false,
  graphiql: {
    // Use WebSockets in GraphiQL
    subscriptionsProtocol: 'WS'
  },
  context: async ({ request, response, req }) => {
    return {
      req,
      request,
      response,
      pubSub,
    };
  },
 })
 
// Pass it into a server to hook into request handlers.
const server = createServer(yoga)
// Create WebSocket server instance from our Node server
const wss = new WebSocketServer({
  server,
  path: yoga.graphqlEndpoint,
})

// Integrate Yoga's Envelop instance and NodeJS server with graphql-ws
useServer(
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: (args) => args.execute(args),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscribe: (args) => args.subscribe(args),
    onSubscribe: async (ctx, msg) => {
      const { schema, execute, subscribe, contextFactory, parse, validate } = yoga.getEnveloped({
        ...ctx,
        req: ctx.extra.request,
        socket: ctx.extra.socket,
        params: msg.payload,
      });

      const args = {
        schema,
        operationName: msg.payload.operationName,
        document: parse(msg.payload.query),
        variableValues: msg.payload.variables,
        contextValue: await contextFactory(),
        execute,
        subscribe,
      };

      const errors = validate(args.schema, args.document);
      if (errors.length) return errors;
      return args;
    },
  },
  wss,
);

// Start the server and you're done!
server.listen(4000, () => {
  console.info('Server is running on http://localhost:4000/graphql')
})