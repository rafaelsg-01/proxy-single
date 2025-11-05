const functions = require('@google-cloud/functions-framework');
const fetch = require('node-fetch');

functions.http('proxySingle', async (Parameter_request, Parameter_response) => {
    try {
        // --- Autenticação ---
        const Const_tokenEnv = process.env.TOKEN_PROXY_SELF;

        const Const_tokenQueryRequest = Parameter_request.query.token;
        const Const_urlQueryRequest = Parameter_request.query.url;
        const Const_methodRequest = Parameter_request.method;

        if (Const_tokenQueryRequest !== Const_tokenEnv) {
            console.log('Invalid token:', Const_tokenQueryRequest);
            Parameter_response.status(461).send('Invalid token');
            return;
        }

        if (!Const_urlQueryRequest) {
            console.log('Missing url parameter');
            Parameter_response.status(462).send('Missing url parameter');
            return;
        }

        if (Const_methodRequest?.toUpperCase() !== 'GET' && Const_methodRequest?.toUpperCase() !== 'POST') {
            console.log('Invalid method:', Const_methodRequest);
            Parameter_response.status(463).send('Method Not Allowed');
            return;
        }
        // --- Fim da Autenticação ---


        // --- Realiza a Requisição Proxy ---
        const Const_headersAuthorizationRequest = Parameter_request.get('Authorization') || Parameter_request.headers['authorization'];
        const Const_headersContentTypeRequest = Parameter_request.get('Content-Type') || Parameter_request.headers['content-type'];

        let Let_requestInitFetch = {
            method: Const_methodRequest,
            headers: {},
            body: Const_methodRequest.toUpperCase() === 'POST' ? Parameter_request : undefined,
        };

        if (Const_headersAuthorizationRequest) {
            Let_requestInitFetch.headers['Authorization'] = Const_headersAuthorizationRequest;
        }

        if (Const_headersContentTypeRequest) {
            Let_requestInitFetch.headers['Content-Type'] = Const_headersContentTypeRequest;
        }

        const Const_responseFetch = await fetch(Const_urlQueryRequest, Let_requestInitFetch);

        Const_responseFetch.headers.forEach((Parameter_value, Paramete_name) => {
            if (Paramete_name.toLowerCase() !== 'content-encoding' && Paramete_name.toLowerCase() !== 'transfer-encoding' && Paramete_name.toLowerCase() !== 'connection') {
                Parameter_response.setHeader(Paramete_name, Parameter_value);
            }
        });

        Parameter_response.status(Const_responseFetch.status);

        Const_responseFetch.body.pipe(Parameter_response);
        // --- Fim da Requisição Proxy ---

    } catch (error) {
        console.error('Error processing request:', error);
        Parameter_response.status(460).send('Internal Server Error');
    }
});
