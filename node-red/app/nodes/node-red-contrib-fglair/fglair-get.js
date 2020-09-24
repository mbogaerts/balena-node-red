module.exports = function(RED) {
    function FgLairGetNode(config) {
        RED.nodes.createNode(this, config);
        const fglair = require('./fglair');
        var node = this;

        node.on('input', function(msg) {

            this.connection = RED.nodes.getNode(config.connection);

            const fglairObj = new fglair.FGLAir(this.connection.credentials.login, 
                                                this.connection.credentials.password,
                                                this.connection.server
                           );

            fglairObj.getDeviceData( config.device ).then((result) => {
                msg.payload = result;
                node.send(msg);
            })
            .catch((error) => {
                msg.payload = error;
                node.send(msg);
            });
        });
    }
    RED.nodes.registerType("fglair-get", FgLairGetNode);
}