import React from 'react';
import { Placeholder, Divider, Container, Icon } from 'semantic-ui-react';
import { range } from 'lodash';

export const PlaceHolderPosts = () =>
  range(1, 3).map((item) => (
    <div key={item}>
      <Placeholder fluid>
        <Placeholder.Header image>
          <Placeholder.Line />
          <Placeholder.Line />
        </Placeholder.Header>
        <Placeholder.Paragraph>
          <Placeholder.Line />
          <Placeholder.Line />
          <Placeholder.Line />
          <Placeholder.Line />
        </Placeholder.Paragraph>
      </Placeholder>
      <Divider hidden />
    </div>
  ));

export const EndMessage = () => (
  <Container textAlign="center">
    <Icon name="refresh" size="large" />
    <Divider hidden />
  </Container>
);

export const LikesPlaceHolder = () =>
  range(1, 6).map((item) => (
    <Placeholder key={item} style={{ minWidth: '200px' }}>
      <Placeholder.Header image>
        <Placeholder.Line length="full" />
      </Placeholder.Header>
    </Placeholder>
  ));
