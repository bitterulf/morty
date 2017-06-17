'use strict';

const Primus = require('primus');

const Path = require('path');
const Hapi = require('hapi');
const Inert = require('inert');

const server = new Hapi.Server({
    connections: {
        routes: {
            files: {
                relativeTo: Path.join(__dirname, 'public')
            }
        }
    }
});

server.connection({ port: 3000 });

server.register(Inert, () => {});

server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
        directory: {
            path: '.',
            redirectToSlash: true,
            index: true
        }
    }
});

const primus = new Primus(server.listener);

const state = {
    users: []
};

const dispatch = function(action) {
    switch (action.type) {
        case 'addUser':
            state.users.push(action.payload);
        break;
        default:

    }

    primus.forEach(function (spark, id, connections) {
      // if (spark.query.foo !== 'bar') return;

      spark.write(state);
    });
};

primus.on('connection', function (spark) {
    dispatch({type: 'addUser', payload: { id: spark.id } });
});

server.start((err) => {

    if (err) {
        throw err;
    }

    console.log('Server running at:', server.info.uri);
});
