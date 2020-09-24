module.exports = function(RED) {
    function FgLairSetNode(config) {
        RED.nodes.createNode(this, config);
        const fglair = require('./fglair');
        var node = this;

        node.on('input', function(msg) {

            var property = config.property;

            this.connection = RED.nodes.getNode(config.connection);
            const fglairObj = new fglair.FGLAir(this.connection.credentials.login, 
                                                this.connection.credentials.password,
                                                this.connection.server);

            fglairObj.setDeviceProp(property, msg.payload).then((result) => {
                msg.payload = result;
                node.send(msg);
            })
            .catch((error) => {
                msg.payload = error;
                node.send(msg);
                console.error(error);
            });
        });
    }

    RED.nodes.registerType("fglair-set", FgLairSetNode);
}