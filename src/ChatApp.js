// src/ChatApp.js
import React, { useState, useEffect } from 'react';
import { ApolloProvider, useMutation, useSubscription } from '@apollo/client';
import client from './ApolloClient';
import gql from 'graphql-tag';

// GraphQL Mutations e Subscriptions
const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($userToId: ID!, $message: String!) {
    sendMessage(userToId: $userToId, message: $message) {
      chatRoomId
      message
      user {
        name
      }
    }
  }
`;

const MESSAGE_SENT_SUBSCRIPTION = gql`
  subscription MessageSent($chatRoomId: ID!) {
    messageSent(chatRoomId: $chatRoomId) {
      message
      user {
        name
      }
    }
  }
`;

function ChatApp() {
  const [authToken, setAuthToken] = useState('');
  const [partnerToken, setPartnerToken] = useState('');
  const [message, setMessage] = useState('');
  const [userToId, setUserToId] = useState('');
  const [chatRoomId, setChatRoomId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Mutation para enviar mensagens
  const [sendMessage] = useMutation(SEND_MESSAGE_MUTATION);

  // Subscription para receber mensagens em tempo real (baseado no chatRoomId)
  const { data: subscriptionData } = useSubscription(MESSAGE_SENT_SUBSCRIPTION, {
    variables: { chatRoomId },
    skip: !chatRoomId, // Evita a subscription até que o chatRoomId seja definido
  });

  // Função para login com dois tokens (usuário principal e parceiro)
  const handleLogin = () => {
    localStorage.setItem('authToken', authToken);
    setIsLoggedIn(true);
  };

  // Função para enviar uma mensagem e capturar o chatRoomId
  const handleSendMessage = async () => {
    try {
      const { data } = await sendMessage({
        variables: {
          userToId,
          message,
        },
      });

      // Captura o chatRoomId na primeira mensagem enviada
      if (!chatRoomId && data.sendMessage.chatRoomId) {
        setChatRoomId(data.sendMessage.chatRoomId);
      }

      setMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  return (
    <div>
      {!isLoggedIn ? (
        <div>
          <h2>Login</h2>
          <input
            type="text"
            placeholder="Token do Usuário Principal"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
          />
          <input
            type="text"
            placeholder="Token do Usuário Parceiro"
            value={partnerToken}
            onChange={(e) => setPartnerToken(e.target.value)}
          />
          <button onClick={handleLogin}>Login</button>
        </div>
      ) : (
        <div>
          <h2>Chat</h2>

          {/* Input para enviar mensagens */}
          <div>
            <input
              type="text"
              placeholder="ID do Usuário Destinatário"
              value={userToId}
              onChange={(e) => setUserToId(e.target.value)}
            />
            <input
              type="text"
              placeholder="Digite sua mensagem"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button onClick={handleSendMessage}>Enviar Mensagem</button>
          </div>

          {/* Exibe mensagens recebidas via subscription */}
          {subscriptionData && (
            <div>
              <p>
                <strong>{subscriptionData.messageSent.user.name}: </strong>
                {subscriptionData.messageSent.message}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Componente principal com ApolloProvider
function App() {
  return (
    <ApolloProvider client={client}>
      <ChatApp />
    </ApolloProvider>
  );
}

export default App;