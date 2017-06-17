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
    const user = state.users.find(function(user) { return user.id == id});

    if (!user) {
        return {};
    }

    state = JSON.parse(JSON.stringify(state));

    state.users = state.users.filter(function(u) {
        if (Math.abs(user.x - u.x) < 2 && Math.abs(user.y - u.y) < 2) {
            return true;
        }

        return false;
    });

    state.users = state.users.map(function(user) {
        if (user.id == id) return user;

        return {
            id: user.id,
            x: user.x,
            y: user.y
        };
    });

    state.portals = state.portals.filter(function(portal) {
        return portal.owner == id || (user.x == portal.x && user.y == portal.y);
    });

    return state;
};

const dispatch = function(action) {
    switch (action.type) {
        case 'addUser':
            state.users.push(action.payload);
        break;
        case 'zapp':
            const user = state.users.find(function(user) { return user.id == action.id});

            if (user) {
                state.portals.push({
                    owner: action.id,
                    x: user.x,
                    y: user.y
                });
            }

        break;
        case 'right':
            state.users = state.users.map(function(user) {
                if (user.id == action.id && user.x <5 ) {
                    user.x++;
                }

                return user;
            });
        break;
        case 'left':
            state.users = state.users.map(function(user) {
                if (user.id == action.id && user.x > 0 ) {
                    user.x--;
                }

                return user;
            });
        break;
        case 'down':
            state.users = state.users.map(function(user) {
                if (user.id == action.id && user.y <5 ) {
                    user.y++;
                }

                return user;
            });
        break;
        case 'up':
            state.users = state.users.map(function(user) {
                if (user.id == action.id && user.y > 0 ) {
                    user.y--;
                }

                return user;
            });
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
        money: 100,
        x: 0,
        y: 0
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
