import { ShaderUp } from '../../src/ShaderUp';
import fragmentShader from './main.frag?raw';

const shader = new ShaderUp({
  fragmentShader,
});

shader.start();
