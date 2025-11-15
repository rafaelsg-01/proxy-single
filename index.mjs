
import http from 'node:http'
import https from 'node:https'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'


const Const_pipe = promisify(pipeline)


export const handler = awslambda.streamifyResponse(
    async (Parameter_event, Parameter_responseStream, Const_context) => {
        try {
            // Autenticação \/
            const Const_tokenEnv = process.env.TOKEN_PROXY_SELF

            const Const_tokenQueryRequest = Parameter_event.queryStringParameters?.token
            const Const_urlQueryRequest = Parameter_event.queryStringParameters?.url
            const Const_methodRequest = Parameter_event.requestContext.http.method
            const Const_bodyRequest = Parameter_event.body

            if (Const_tokenQueryRequest !== Const_tokenEnv) {
                //console.log('Invalid token:', Const_tokenQueryRequest)
                const Const_metadata = {
                    statusCode: 461,
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
                    statusCode: 462,
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
                    statusCode: 463,
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

            let Let_urlFetch = ''
            let Let_requestInitFetch = { headers: {} }

            if (Const_urlQueryRequest) {
                Let_urlFetch = Const_urlQueryRequest
            }

            if (Const_methodRequest) {
                Let_requestInitFetch.method = Const_methodRequest
            }

            const Const_allowedHeaders = [
                'Accept-Language',
                'Authorization',
                'Content-Type',
                'Sec-CH-UA',
                'Sec-CH-UA-Mobile',
                'Sec-CH-UA-Platform',
                'Sec-Fetch-Dest',
                'Sec-Fetch-Mode',
                'Sec-Fetch-Site',
                'Sec-Fetch-User',
                'Referer',
                'H31ffadrg3bb7',
                'X-Requested-With',
            ]

            for (let Let_single of Const_allowedHeaders) {
                if (Parameter_event.headers?.[Let_single] || Parameter_event.headers?.[Let_single.toLowerCase()]) {
                    Let_requestInitFetch.headers[Let_single] = Parameter_event.headers?.[Let_single] || Parameter_event.headers?.[Let_single.toLowerCase()]
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

        catch (Parameter_error) {
            //console.error('Error processing request:', Parameter_error)
            const Const_metadata = {
                statusCode: 460,
                headers: {
                    "Content-Type": 'text/plain'
                }
            }
            Parameter_responseStream = awslambda.HttpResponseStream.from(Parameter_responseStream, Const_metadata)
            Parameter_responseStream.write("Internal Server Error")
            Parameter_responseStream.end()
            return
        }
    }
)
