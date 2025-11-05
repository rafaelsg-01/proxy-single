// index.js
import http from 'node:http';
import https from 'node:https';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';

const pipe = promisify(pipeline);

export const handler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
    
    const queryParams = event.queryStringParameters || {};
    const url = queryParams.url;
    const token = queryParams.token;

    // Valida se passou token e se é igual a '123'
    if (!token || token !== '123') {
      const errorResponse = {
        statusCode: 403,
        body: JSON.stringify({ error: "Token inválido ou ausente" }),
      };
      responseStream = awslambda.HttpResponseStream.from(responseStream, errorResponse);
      responseStream.end();
      return;
    }

    if (!url) {
      const errorResponse = {
        statusCode: 400,
        body: JSON.stringify({ error: "Parâmetro ?url é obrigatório" }),
      };
      responseStream = awslambda.HttpResponseStream.from(responseStream, errorResponse);
      responseStream.end();
      return;
    }

    const method = event.requestContext.http.method || 'GET';
    const lib = url.startsWith('https') ? https : http;

    // Prepara os headers para repassar, se existirem
    const forwardedHeaders = {};
    if (event.headers?.authorization) {
      forwardedHeaders['Authorization'] = event.headers.authorization;
    }
    if (event.headers?.['content-type']) {
      forwardedHeaders['Content-Type'] = event.headers['content-type'];
    }

    await new Promise((resolve, reject) => {
      const req = lib.request(url, { method, headers: forwardedHeaders }, (res) => {
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

      if (method === 'POST' && event.body) {
        const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
        req.write(body);
      }

      req.end();
    });
  }
);
