// Jest setup provided by Grafana scaffolding
import './.config/jest-setup';

// Add TextEncoder/TextDecoder polyfill for jsdom environment
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
