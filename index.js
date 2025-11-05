// index.js
import http from 'node:http';
import https from 'node:https';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';

const pipe = promisify(pipeline);

export const handler = awslambda.streamifyResponse(
    async (event, responseStream, context) => {
        const Const_tokenEnv = '123' || process.env.TOKEN_PROXY_SELF;

        const Const_tokenQueryRequest = event.queryStringParameters?.token
        const Const_urlQueryRequest = event.queryStringParameters?.url
        const Const_methodRequest = event.requestContext.http.method
        const Const_bodyRequest = event.body

        if (Const_tokenQueryRequest !== Const_tokenEnv) {
            const metadata = {
                statusCode: 403,
                headers: {
                    "Content-Type": "text/plain"
                }
            };
            responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);
            responseStream.write("Token inválido ou ausente");
            responseStream.end();
            return;
        }

        if (!Const_urlQueryRequest) {
            const metadata = {
                statusCode: 400,
                headers: {
                    "Content-Type": 'text/plain'
                }
            };
            responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);
            responseStream.write("Parâmetro ?url é obrigatório");
            responseStream.end();
            return;
        }

        const lib = Const_urlQueryRequest.startsWith('https') ? https : http;

        // Prepara os headers para repassar, se existirem
        const forwardedHeaders = {};
        if (event.headers?.authorization) {
            forwardedHeaders['Authorization'] = event.headers.authorization;
        }
        if (event.headers?.['content-type']) {
            forwardedHeaders['Content-Type'] = event.headers['content-type'];
        }

        await new Promise((resolve, reject) => {
        const req = lib.request(Const_urlQueryRequest, { method: Const_methodRequest, headers: forwardedHeaders }, (res) => {
            const metadata = {
                statusCode: res.statusCode,
                headers: {
                    "Content-Type": res.headers['content-type'] || 'text/plain'
                }
            };
            responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

            pipe(res, responseStream).then(resolve).catch(reject);
        });

        req.on('error', (err) => reject(err));

        if (Const_methodRequest === 'POST' && Const_bodyRequest) {
            const body = event.isBase64Encoded ? Buffer.from(Const_bodyRequest, 'base64') : Const_bodyRequest;
            req.write(body);
        }

        req.end();
        });
    }
);
