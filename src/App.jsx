import React, { useState, useEffect } from 'react';
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  useQuery,
  useMutation,
  useSubscription,
  createHttpLink,
  gql,
  split
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';


// GraphQL Endpoint URL
const uri = 'https://clicklav.com.br/api/v1/graphql';

// Apollo Client setup
const httpLink = createHttpLink({
  uri
});

const authLink = setContext((_, { headers }) => {
  // get the authentication token from local storage if it exists
  const token = localStorage.getItem('userToken');
  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://clicklav.com.br/api/v1/graphql',
  }),
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
  },
  wsLink,
  authLink.concat(httpLink),
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache()
});

// GraphQL Operations
const GET_CHAT_ROOM = gql`
  query ChatRoom {
    chatRoom {
      id
      chats {
        message
        user {
          id
          name
        }
      }
    }
  }
`;

const SEND_MESSAGE_USER = gql`
  mutation SendMessageUser($userToId: Int!, $message: String!) {
    sendMessage(userToId: $userToId, message: $message) {
      chatRoomId
      message
      user {
        name
      }
      room {
        userOne {
          name
        }
        userTwo {
          name
        }
      }
    }
  }
`;

const CHAT_SUBSCRIPTION = gql`
  subscription Chat($chatRoomId: ID!) {
    messageSent(chatRoomId: $chatRoomId) {
      message
      user {
        name
      }
    }
  }
`;

// App Component
const App = () => {
  const [chatRoomId, setChatRoomId] = useState(null);
  const [accumulatedData, setAccumulatedData] = useState([]),
    [clientAuthToken, setClientAuthToken] = useState(null),
    [partnerAuthToken, setPartnerAuthToken] = useState(null),
    [clientId, setClientId] = useState(null),
    [partnerId, setPartnerId] = useState(null),
    [clientMessage, setClientMessage] = useState(null),
    [partnerMessage, setPartnerMessage] = useState(null);

  const { data: chatRoomData, refetch } = useQuery(GET_CHAT_ROOM, {
    skip: !chatRoomId,
    fetchPolicy: 'network-only',
    variables: { chatRoomId },
    onCompleted: (data) => {
      console.log(data)
    }
  });
  const [sendMessage] = useMutation(SEND_MESSAGE_USER);

  // Subscriptions
  const { data: subscriptionData } = useSubscription(
    CHAT_SUBSCRIPTION,
    {
      variables: { chatRoomId },
      shouldResubscribe: true,
      onData({ data }) {
        console.log(data)
        setAccumulatedData((prev) => [...prev, data.sendMessage])
      }
    }
  );

  const handleSendMessage = async (user="client") => {
    // set userToken
    localStorage.setItem('userToken', user === "client" ? clientAuthToken : partnerAuthToken);

    // faz a requisição de envio de mensagem
    const response = await sendMessage({
      variables: { userToId: parseInt(user === "client" ? partnerId : clientId), message: user === "client" ? clientMessage : partnerMessage },
    });

    if (response.data && !chatRoomId) {
      setChatRoomId(response.data.sendMessage.chatRoomId); // Capture chatRoomId on first message
      refetch(); // Refetch the chat room after sending message
    }
  };

  useEffect(() => {
    // captura o token do cliente e verifica seu id com jwt
    if (clientAuthToken) {
      const decoded = JSON.parse(window.atob(clientAuthToken.split('.')[1]));
      setClientId(decoded.sub);
    }

    // captura o token do parceiro e verifica seu id com jwt
    if (partnerAuthToken) {
      const decoded = JSON.parse(window.atob(partnerAuthToken.split('.')[1]));
      setPartnerId(decoded.sub);
    }
  }, [clientAuthToken, partnerAuthToken]);

  return (
    <div>
      <h1>Real-Time Chat</h1>

      <div>
        <section>
          <h2>Usuários</h2>
          <h3>Cliente {clientId && `(ID: ${clientId})`}</h3>
          <input type="text" placeholder="token" value={clientAuthToken} onChange={(e) => setClientAuthToken(e.target.value)} /> {(clientId && partnerId) && <><input type="text" placeholder="Enviar Mensagem" value={clientMessage} onChange={(e) => setClientMessage(e.target.value)} /><button onClick={() => handleSendMessage("client")}>Enviar Mensagem</button></>}
          <h3>Parceiro {partnerId && `(ID: ${partnerId})`}</h3>
          <input type="text" placeholder="token" value={partnerAuthToken} onChange={(e) => setPartnerAuthToken(e.target.value)} /> {(clientId && partnerId) && <><input type="text" placeholder="Enviar Mensagem" value={partnerMessage} onChange={(e) => setPartnerMessage(e.target.value)} /><button onClick={() => handleSendMessage("partner")}>Enviar Mensagem</button></>}
        </section>
      </div>

      {(chatRoomId && chatRoomData) && (
        <div>
          <h2>Chat Room - Mensagens Antigas</h2>
          {chatRoomData.chatRoom[0].chats.map((chat, index) => (
            <div key={index}>
              <p><strong>{chat.user.name}</strong>: {chat.message}</p>
            </div>
          ))}
        </div>
      )}

      {accumulatedData.length && (
        <div>
          <h2>Mensagens via Subscription - Tempo Real</h2>
          {accumulatedData.map((chat, index) => (
          <div key={index}>
          <p>
            <strong>{chat.user.name}</strong>: {chat.message}
          </p>
          </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Wrap App with ApolloProvider
export default function Root() {
  return (
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  );
}