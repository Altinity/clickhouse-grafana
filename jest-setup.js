// Jest setup provided by Grafana scaffolding
import './.config/jest-setup';
import { TextDecoder, TextEncoder } from 'text-encoding';

global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;
