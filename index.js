import { pipeline } from 'node:stream/promises';

// O handler agora é envolvido por awslambda.streamifyResponse.
// Isso adiciona um segundo argumento, 'responseStream', ao nosso handler.
export const handler = awslambda.streamifyResponse(async (event, responseStream) => {
    try {
        // --- Autenticação \/ --- (Lógica idêntica à anterior)
        const Const_tokenEnv = process.env.TOKEN_PROXY_SELF;
        const Const_tokenQueryRequest = event.queryStringParameters?.token;
        const Const_urlQueryRequest = event.queryStringParameters?.url;
        const Const_methodRequest = event.httpMethod;
        const Const_bodyRequest = event.body;

        if (Const_tokenQueryRequest !== Const_tokenEnv) {
            console.log('Invalid token:', Const_tokenQueryRequest);
            // Com o stream, escrevemos os metadados antes de enviar o corpo.
            responseStream.setContentType('text/plain');
            responseStream.write('invalid token');
            responseStream.end();
            // A AWS usa os metadados HTTP para definir o status. Aqui não definimos, então o padrão é 200.
            // Para status de erro, é preciso usar a API de metadados.
            // Por simplicidade em erros, a abordagem anterior (retornar objeto) é mais fácil.
            // Vamos focar no caso de sucesso, que é onde o streaming importa.
            // Para erros, podemos simplesmente retornar um objeto como antes, se a função não for stream por padrão.
            // Mas vamos manter a consistência aqui:
            const metadata = { statusCode: 451 };
            const fullResponse = { ...metadata, body: 'invalid token' };
            // A API de stream não tem uma forma fácil de setar status code depois de iniciada,
            // então para erros, o retorno de um objeto é mais prático.
            // Vamos misturar as abordagens: objeto para erro, stream para sucesso.
            return { statusCode: 451, body: 'invalid token', headers: {'Content-Type': 'text/plain'} };
        }

        if (!Const_urlQueryRequest) {
            return { statusCode: 452, body: 'missing url parameter', headers: {'Content-Type': 'text/plain'} };
        }

        if (Const_methodRequest?.toUpperCase() !== 'GET' && Const_methodRequest?.toUpperCase() !== 'POST') {
             return { statusCode: 453, body: 'Method Not Allowed', headers: {'Content-Type': 'text/plain'} };
        }
        // --- Autenticação /\ ---


        // --- Realiza request \/ ---
        const Const_headersAuthorizationRequest = event.headers?.authorization;
        const Const_headersContentTypeRequest = event.headers?.['content-type'];

        let Let_urlFetch = Const_urlQueryRequest;
        let Let_requestInitFetch = {
            method: Const_methodRequest,
            headers: {}
        };
        
        // O `fetch` permite que o corpo seja undefined, então não precisamos do 'if'.
        Let_requestInitFetch.body = Const_bodyRequest;

        if (Const_headersAuthorizationRequest) {
            Let_requestInitFetch.headers['Authorization'] = Const_headersAuthorizationRequest;
        }
        if (Const_headersContentTypeRequest) {
            Let_requestInitFetch.headers['Content-Type'] = Const_headersContentTypeRequest;
        }

        const Const_responseFetch = await fetch(Let_urlFetch, Let_requestInitFetch);

        // Constrói o objeto de cabeçalhos da resposta final.
        const responseHeaders = {};
        Const_responseFetch.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        // Escreve os metadados HTTP (status, headers) no stream de resposta.
        // A AWS irá lê-los e montar a resposta HTTP real.
        responseStream.writeHead(Const_responseFetch.status, responseHeaders);

        // Agora, o mais importante: conectamos o stream do corpo da resposta do fetch
        // diretamente ao stream de resposta da Lambda.
        // Os dados fluirão do URL de destino para o cliente sem serem armazenados na memória.
        await pipeline(Const_responseFetch.body, responseStream);
        
        // Não há retorno explícito aqui, pois o stream foi finalizado pelo pipeline.
        // --- Realiza request /\ ---
    }
    catch (Parameter_error) {
        console.error('Error processing request:', Parameter_error);
        // Em caso de erro catastrófico, escrevemos uma resposta de erro no stream.
        responseStream.writeHead(450, { 'Content-Type': 'text/plain' });
        responseStream.write('Internal Server Error');
        responseStream.end();
    }
});