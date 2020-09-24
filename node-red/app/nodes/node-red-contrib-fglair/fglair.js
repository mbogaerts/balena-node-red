const axios = require('axios').default;
const fs = require('fs');
const { resolve } = require('path');

class FGLAir 
{
    constructor( login, password, server)
    {
        this.login = login;
        this.password = password;
        this.server = server;    
        this.config = {
            "servers": {
                "europe": {
                    "url": "https://ads-field-eu.aylanetworks.com",
                    "app_id": "FGLair-eu-id",
                    "app_secret": "FGLair-eu-gpFbVBRoiJ8E3QWJ-QRULLL3j3U"
                },
                "china": {
                    "url": "https://user-field.ayla.com.cn",
                    "app_id": "FGLairField-cn-id",
                    "app_secret": "FGLairField-cn-zezg7Y60YpAvy3HPwxvWLnd4Oh4"
                },
                "other": {
                    "url": "https://user-field.aylanetworks.com",
                    "app_id": "CJIOSP-id",
                    "app_secret": "CJIOSP-Vb8MQL_lFiYQ7DKjN0eCFXznKZE"
                }
            },
            "endpoints": {
                "sign_in": "/users/sign_in.json",
                "devices": "/apiv1/devices.json",
                "dsns_prefix": "/apiv1/dsns/",
                "dsns_suffix": "/properties.json",
                "properties_prefix": "/apiv1/properties/", 
                "properties_suffix": "/datapoints.json"
            }
        };
    }

    async authenticate() {
        var needsServerAuthentication = false;
        var tokenData = "";
        var token = "";
        
        try{
            tokenData = fs.readFileSync('token.json', 'utf8');
            tokenData = JSON.parse(tokenData);
            if( Date.now() > tokenData.expires_in*1000 + tokenData.requested_at )
            {
                needsServerAuthentication = true;
            }
            else
            {
                needsServerAuthentication = false;
            }
        }
        catch(error)
        {
            if(error.code == 'ENOENT')
            {
                needsServerAuthentication = true;
            }
            else
            {
                throw error;
            }
        }

        if( needsServerAuthentication )
        {
            const serverConfig = this.config.servers[this.server];
            const url = serverConfig.url + this.config.endpoints.sign_in;
    
            const loginRequestParams = { "user": {
                "email": this.login,
                "password": this.password,
                "application": {
                    "app_id": serverConfig.app_id,
                    "app_secret": serverConfig.app_secret
                }
            }};

            const headers = {
                'Content-Type': 'application/json'
            }
              
            await axios.post(url, loginRequestParams, {'headers' : headers })
                .then((response) => {
                    tokenData = { ...response.data, "requested_at": Date.now()}
                    token = JSON.stringify(tokenData);
                    fs.writeFileSync('token.json', token );
                })
                .catch((error) => {
                    console.error(error);
                });
        }
        token = tokenData.access_token;
        return token;
    }

    async getAircoList(){
        const token = await this.authenticate();
        const url = this.config.servers[this.server].url + this.config.endpoints.devices;
        const headers = { "Authorization": "auth-token " + token };
        const deviceHeaders = { "Authorization": "auth-token " + token };
        const deviceurlpart1 = this.config.servers[this.server].url + this.config.endpoints.dsns_prefix;
        const deviceurlpart2 = this.config.endpoints.dsns_suffix;
          
        let airco_promise = new Promise((resolve, reject) => {
            var device_props = {};
            axios.get(url, {'headers': headers}).then(response => {
                const promises = [];
                for(var i = 0; i < response.data.length; i++) {
                    device_props[response.data[i].device.dsn] = {'dsn': response.data[i].device.dsn,
                                                                 'lan_ip': response.data[i].device.lan_ip,
                                                                 'connection_status': response.data[i].device.connection_status
                                                                };
                    var promise = axios.get(`${deviceurlpart1}${response.data[i].device.dsn}${deviceurlpart2}`, {'headers': deviceHeaders});
                    promises.push(promise);
                }
            
                Promise.all(promises)
                .then((aircos) => {
                    aircos.map((airco) => {
                        var dsn = airco.config.url.split('/')[5];
                        airco.data.map((entry) => {
                            if(entry.property.name == 'device_name')
                            {
                                device_props[dsn].device_name = entry.property.value;
                            }
                        })
                    })
                    resolve(device_props);
                })
                .catch((error) => {reject(error)}); 
            
            }).catch((error) => console.error(error));

        }).catch((error) => console.error(error));

        return airco_promise;
    }

    async getDeviceData(device){

        const token = await this.authenticate();

        const url = this.config.servers[this.server].url + this.config.endpoints.dsns_prefix + device + this.config.endpoints.dsns_suffix;
        const headers = { "Authorization": "auth-token " + token };
        var airco_props = {};
        
        let data_promise = new Promise((resolve, reject) => {

            axios.get(url, {'headers' : headers })
            .then((response) => {
                const airco_data = response.data;
                
                airco_data.map(async (airco_prop, index) => {
                    airco_props[airco_prop.property.name] = { ...airco_prop.property };
                });

                resolve(airco_props);
            })
            .catch((error) => {
                console.error(error);
                reject(error);
            });
        });

        return data_promise;
        
    }

    async setDeviceProp( property, value)
    {
        const token = await this.authenticate();
        const url = this.config.servers[this.server].url + this.config.endpoints.properties_prefix + property + this.config.endpoints.properties_suffix
        const headers = { "Authorization": "auth-token " + token };
        var result = {};

        var formattedValue = {"datapoint": {"value": value }};

        await axios.post(url, formattedValue, {'headers' : headers })
                .then((response) => {
                    result = response.data;
                })
                .catch((error) => {
                    console.error(error);
                });

        return result;
    }
}
module.exports.FGLAir = FGLAir;