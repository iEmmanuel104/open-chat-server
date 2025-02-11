import { App } from './app';

const app = new App();

process.on('SIGINT', () => {
    app.cleanup();
});

app.initialize();