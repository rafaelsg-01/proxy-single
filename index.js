import { pipeline } from 'node:stream/promises';

// Para usar RESPONSE_STREAM, o handler principal precisa ser envolvido pelo awslambda.streamifyResponse
// Esta variável global 'awslambda' é fornecida automaticamente pelo runtime da AWS Lambda.
export const handler = awslambda.streamifyResponse(async (event, responseStream, context) => {
    try {
        // --- Autenticação e Validação ---

        // 1. Obter o token do ambiente da Lambda
        // Você deve configurar uma variável de ambiente chamada 'PROXY_TOKEN' na sua função Lambda.
        const Const_tokenEnv = process.env.PROXY_TOKEN;

        // 2. Obter parâmetros da query string
        const Const_tokenQueryRequest = event.queryStringParameters?.token;
        const Const_urlQueryRequest = event.queryStringParameters?.url;

        // 3. Obter o método e corpo da requisição
        const Const_methodRequest = event.requestContext.http.method;
        const Const_bodyRequest = event.body;

        if (Const_tokenQueryRequest !== Const_tokenEnv) {
            console.log('Token inválido:', Const_tokenQueryRequest);
            responseStream.write('Token inválido');
            responseStream.end();
            return;
        }

        if (!Const_urlQueryRequest) {
            console.log('Parâmetro de URL ausente');
            responseStream.write('Parâmetro de URL ausente');
            responseStream.end();
            return;
        }

        if (Const_methodRequest?.toUpperCase() !== 'GET' && Const_methodRequest?.toUpperCase() !== 'POST') {
            console.log('Método inválido:', Const_methodRequest);
            responseStream.write('Método não permitido');
            responseStream.end();
            return;
        }

        // --- Realiza a Requisição (Fetch) ---

        const Const_headersAuthorizationRequest = event.headers['Authorization'] || event.headers['authorization'];
        const Const_headersContentTypeRequest = event.headers['Content-Type'] || event.headers['content-type'];

        const Let_requestInitFetch = {
            method: Const_methodRequest,
            headers: {},
        };

        // Adiciona o corpo (body) apenas para métodos que o suportam, como POST
        if (Const_bodyRequest && Const_methodRequest?.toUpperCase() === 'POST') {
            Let_requestInitFetch.body = Const_bodyRequest;
        }
        
        if (Const_headersAuthorizationRequest) {
            Let_requestInitFetch.headers['Authorization'] = Const_headersAuthorizationRequest;
        }

        if (Const_headersContentTypeRequest) {
            Let_requestInitFetch.headers['Content-Type'] = Const_headersContentTypeRequest;
        }

        const Const_responseFetch = await fetch(Const_urlQueryRequest, Let_requestInitFetch);

        // --- Streaming da Resposta ---

        // Define os metadados da resposta HTTP (status e headers)
        const metadata = {
            statusCode: Const_responseFetch.status,
            headers: Object.fromEntries(Const_responseFetch.headers.entries())
        };

        // Cria o stream de resposta HTTP com os metadados
        const httpResponseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

        // Usa 'pipeline' para transmitir o corpo da resposta do fetch diretamente para a resposta da Lambda.
        // Isso é eficiente em termos de memória, pois não carrega o corpo inteiro na memória.
        await pipeline(Const_responseFetch.body, httpResponseStream);

    } catch (error) {
        console.error('Ocorreu um erro:', error);
        responseStream.write('Erro interno do servidor.');
        responseStream.end();
    }
});