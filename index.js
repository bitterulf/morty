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
    users: [],
    portals: []
};

const filterStateForUser = function(state, id) {
    state.users = state.users.map(function(user) {
        if (user.id == id) return user;

        return {
            id: user.id
        };
    });

    state.portals = state.portals.filter(function(portal) {
        return portal.owner == id;
    });

    return state;
};

const dispatch = function(action) {
    switch (action.type) {
        case 'addUser':
            state.users.push(action.payload);
        break;
        case 'zapp':
            state.portals.push({owner: action.id});
        break;
        default:

    }

    primus.forEach(function (spark, id, connections) {
      console.log('ideo', id);
      // if (spark.query.foo !== 'bar') return;

      spark.write(filterStateForUser(state, id));
    });
};

primus.on('connection', function (spark) {
    dispatch({type: 'addUser', payload: {
        id: spark.id,
        money: 100
    } });

    spark.on('data', function (data) {
        data.id = spark.id;
        dispatch(data);
    });
});

server.start((err) => {

    if (err) {
        throw err;
    }

    console.log('Server running at:', server.info.uri);
});
