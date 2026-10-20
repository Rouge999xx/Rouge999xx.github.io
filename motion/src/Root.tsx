import React from 'react';
import {Composition} from 'remotion';
import {FlowAutoVideo} from './FlowAuto';
import {ServicesVideo} from './Services';
import {totalFrames} from './kit';
import {FPS} from './theme';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="FlowAuto" component={FlowAutoVideo} durationInFrames={totalFrames('flowauto')} fps={FPS} width={1920} height={1080} />
    <Composition id="Services" component={ServicesVideo} durationInFrames={totalFrames('services')} fps={FPS} width={1920} height={1080} />
  </>
);
