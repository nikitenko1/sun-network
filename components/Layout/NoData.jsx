import { Message, Button } from 'semantic-ui-react';

export const NoMessages = () => (
  <Message
    info
    icon="telegram plane"
    header="Sorry"
    content="You have not messaged anyone yet.Search above to message someone!"
  />
);

export const NoPosts = () => (
  <Message
    info
    icon="meh"
    header="Hey!"
    content="No Posts. Make sure you have followed someone."
  />
);

export const NoNotifications = ({ notifications }) => (
  <Message
    header={`Length! ${notifications.length}`}
    content="No Notifications"
    icon="smile"
    info
  />
);

export const NoPostFound = () => (
  <Message info icon="meh" header="Hey!" content="No Post Found." />
);

export const NoProfilePosts = () => (
  <>
    <Message
      info
      icon="meh"
      header="Sorry"
      content="User has not posted anything yet!"
    />
    <Button
      icon="long arrow alternate left"
      content="Go Back"
      as="a"
      href="/"
    />
  </>
);

export const NoFollowData = ({ followersComponent, followingComponent }) => (
  <>
    {followersComponent && (
      <Message
        icon="user outline"
        info
        content={`User does not have followers`}
      />
    )}
    {/*  */}
    {followingComponent && (
      <Message
        icon="user outline"
        info
        content={`User does not follow any users`}
      />
    )}
  </>
);
