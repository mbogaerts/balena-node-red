module.exports = function(RED) {

    function FglairConfigNode(config) {
        RED.nodes.createNode(this, config);
        this.server = config.server;
        var credentials = this.credentials;
        if (credentials) { 
            this.login = credentials.login; 
            this.password = credentials.password;
        }
    }

    RED.nodes.registerType("fglair-config",FglairConfigNode, {credentials:{login:'text', password:'password'}});

    RED.httpAdmin.get("/devices", function(req,res) {
        const devices = ["device1", "device2", "device3"];
        res.send(JSON.stringify(devices));
    });

    RED.httpAdmin.get("/airco_list/:id", function(req,res) {
        fglair = require('./fglair');
        var configNode = RED.nodes.getNode(req.params.id);
        const fglairObj = new fglair.FGLAir(configNode.credentials.login, 
                                            configNode.credentials.password,
                                            configNode.server);
        fglairObj.getAircoList().then((result) => {
            res.send(JSON.stringify(result));
        });
    });

    RED.httpAdmin.get("/airco_props/:configid/:dsn", function(req,res) {
        fglair = require('./fglair');
        var configNode = RED.nodes.getNode(req.params.configid);
        var dsn = req.params.dsn;
        const fglairObj = new fglair.FGLAir(configNode.credentials.login, 
                                            configNode.credentials.password,
                                            configNode.server);

        fglairObj.getDeviceData(dsn).then((result) => {

            res.send(JSON.stringify(result));
        })
    });
}