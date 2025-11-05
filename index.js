
import http from 'node:http'
import https from 'node:https'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'


const Const_pipe = promisify(pipeline)


export const handler = awslambda.streamifyResponse(
    async (Parameter_event, Parameter_responseStream, Const_context) => {
        // Autenticação \/
        const Const_tokenEnv = '123' || process.env.TOKEN_PROXY_SELF

        const Const_tokenQueryRequest = Parameter_event.queryStringParameters?.token
        const Const_urlQueryRequest = Parameter_event.queryStringParameters?.url
        const Const_methodRequest = Parameter_event.requestContext.http.method
        const Const_bodyRequest = Parameter_event.body

        if (Const_tokenQueryRequest !== Const_tokenEnv) {
            //console.log('Invalid token:', Const_tokenQueryRequest)
            const Const_metadata = {
                statusCode: 403,
                headers: {
                    "Content-Type": "text/plain"
                }
            }
            Parameter_responseStream = awslambda.HttpResponseStream.from(Parameter_responseStream, Const_metadata);
            Parameter_responseStream.write("Invalid token")
            Parameter_responseStream.end()
            return
        }

        if (!Const_urlQueryRequest) {
            //console.log('Missing url parameter')
            const Const_metadata = {
                statusCode: 400,
                headers: {
                    "Content-Type": 'text/plain'
                }
            }
            Parameter_responseStream = awslambda.HttpResponseStream.from(Parameter_responseStream, Const_metadata)
            Parameter_responseStream.write("Missing url parameter")
            Parameter_responseStream.end()
            return
        }

        if (Const_methodRequest?.toUpperCase() !== 'GET' && Const_methodRequest?.toUpperCase() !== 'POST') {
            //console.log('Invalid method:', Const_methodRequest)
            const Const_metadata = {
                statusCode: 405,
                headers: {
                    "Content-Type": 'text/plain'
                }
            }
            Parameter_responseStream = awslambda.HttpResponseStream.from(Parameter_responseStream, Const_metadata)
            Parameter_responseStream.write("Method Not Allowed")
            Parameter_responseStream.end()
            return
        }
        // Autenticação /\

        // Realiza request \/
        const Const_moduleHttpsOrHttp = Const_urlQueryRequest.startsWith('https') ? https : http

        // Prepara os headers para repassar, se existirem
        const Const_headersAuthorizationRequest = Parameter_event.headers?.['Authorization'] || Parameter_event.headers?.['authorization']
        const Const_headersContentTypeRequest = Parameter_event.headers?.['Content-Type'] || Parameter_event.headers?.['content-type']
        
        let Let_urlFetch = ''
        let Let_requestInitFetch = {}

        if (Const_urlQueryRequest) {
            Let_urlFetch = Const_urlQueryRequest
        }

        if (Const_methodRequest) {
            Let_requestInitFetch.method = Const_methodRequest
        }

        if (Const_headersAuthorizationRequest) {
            Let_requestInitFetch.headers = {
                'Authorization': Const_headersAuthorizationRequest,
                ...Let_requestInitFetch.headers
            }
        }

        if (Const_headersContentTypeRequest) {
            Let_requestInitFetch.headers = {
                'Content-Type': Const_headersContentTypeRequest,
                ...Let_requestInitFetch.headers
            }
        }

        await new Promise((Parameter_resolve, Parameter_reject) => {
            const Const_responseFetch = Const_moduleHttpsOrHttp.request(Const_urlQueryRequest, Let_requestInitFetch, (Parameter_responseFetch) => {
                const Const_metadata = {
                    statusCode: Parameter_responseFetch.statusCode,
                    headers: {
                        "Content-Type": Parameter_responseFetch.headers['content-type'] || 'text/plain'
                    }
                }
                Parameter_responseStream = awslambda.HttpResponseStream.from(Parameter_responseStream, Const_metadata)

                Const_pipe(Parameter_responseFetch, Parameter_responseStream).then(Parameter_resolve).catch(Parameter_reject)
            })

            Const_responseFetch.on('error', (Parameter_error) => Parameter_reject(Parameter_error))

            if (Const_methodRequest === 'POST' && Const_bodyRequest) {
                const Const_body = Parameter_event.isBase64Encoded ? Buffer.from(Const_bodyRequest, 'base64') : Const_bodyRequest
                Const_responseFetch.write(Const_body)
            }

            Const_responseFetch.end()
        })
        // Realiza request /\
    }
)
