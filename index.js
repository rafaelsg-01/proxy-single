// Importe a função 'pipeline' para conectar os streams de forma segura.
import { pipeline } from 'node:stream/promises';
// O aws-lambda-ric (Runtime Interface Client) já inclui o 'fetch' no Node.js 18+.

export const handler = async (event) => {
    // A AWS Lambda com streaming não usa um handler com 'responseStream' diretamente
    // quando se usa o runtime Node.js 18+. O runtime detecta o streaming
    // e permite retornar um objeto de resposta que contém um corpo de stream.
    // Isso simplifica o código.

    // O 'if (Const_pathname === '/proxy-single')' foi removido pois a própria
    // invocação da função pelo API Gateway já faz esse roteamento.

    try {
        // --- Autenticação \/ ---
        // Acessa a variável de ambiente configurada na própria função Lambda.
        const Const_tokenEnv = process.env.TOKEN_PROXY_SELF;

        // Parâmetros vêm de 'event.queryStringParameters'.
        const Const_tokenQueryRequest = event.queryStringParameters?.token;
        const Const_urlQueryRequest = event.queryStringParameters?.url;
        // Método e corpo vêm do objeto 'event'.
        const Const_methodRequest = event.httpMethod;
        // O corpo da requisição na Lambda é uma string.
        const Const_bodyRequest = event.body;

        if (Const_tokenQueryRequest !== Const_tokenEnv) {
            console.log('Invalid token:', Const_tokenQueryRequest);
            return {
                statusCode: 451,
                headers: { "Content-Type": "text/plain" },
                body: 'invalid token'
            };
        }

        if (!Const_urlQueryRequest) {
            console.log('Missing url parameter');
            return {
                statusCode: 452,
                headers: { "Content-Type": "text/plain" },
                body: 'missing url parameter'
            };
        }

        if (Const_methodRequest?.toUpperCase() !== 'GET' && Const_methodRequest?.toUpperCase() !== 'POST') {
            console.log('Invalid method:', Const_methodRequest);
            return {
                statusCode: 453,
                headers: { "Content-Type": "text/plain" },
                body: 'Method Not Allowed'
            };
        }
        // --- Autenticação /\ ---


        // --- Realiza request \/ ---
        // Cabeçalhos na Lambda vêm em 'event.headers' e são geralmente minúsculos.
        const Const_headersAuthorizationRequest = event.headers?.authorization;
        const Const_headersContentTypeRequest = event.headers?.['content-type'];

        let Let_urlFetch = Const_urlQueryRequest;
        let Let_requestInitFetch = {};

        if (Const_methodRequest) {
            Let_requestInitFetch.method = Const_methodRequest;
        }

        // Adiciona o corpo apenas se ele existir, para não quebrar requisições GET.
        if (Const_bodyRequest) {
            Let_requestInitFetch.body = Const_bodyRequest;
        }

        // Inicia um objeto de cabeçalhos vazio para evitar erros.
        Let_requestInitFetch.headers = {};

        if (Const_headersAuthorizationRequest) {
            Let_requestInitFetch.headers['Authorization'] = Const_headersAuthorizationRequest;
        }

        if (Const_headersContentTypeRequest) {
            Let_requestInitFetch.headers['Content-Type'] = Const_headersContentTypeRequest;
        }

        // Realiza a chamada fetch. O fetch é nativo no runtime Node.js 18+ da AWS.
        const Const_responseFetch = await fetch(Let_urlFetch, Let_requestInitFetch);

        // Converte os Headers do fetch para um objeto simples que a Lambda entende.
        const responseHeaders = {};
        Const_responseFetch.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });
        
        // Com o streaming ativado, você pode retornar o stream do corpo diretamente.
        // O AWS Lambda se encarrega de fazer o pipe dos dados para o cliente.
        return {
            statusCode: Const_responseFetch.status,
            headers: responseHeaders,
            body: Const_responseFetch.body
        };
        // --- Realiza request /\ ---
    }
    catch (Parameter_error) {
        console.error('Error processing request:', Parameter_error);
        return {
            statusCode: 450,
            headers: { "Content-Type": "text/plain" },
            body: 'Internal Server Error'
        };
    }
};