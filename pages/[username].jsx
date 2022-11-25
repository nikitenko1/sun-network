import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useRouter } from 'next/router';
import axios from 'axios';
import baseUrl from '../utils/baseUrl';
import { parseCookies } from 'nookies';
import { Grid } from 'semantic-ui-react';
import { NoProfilePosts, NoProfile } from '../components/Layout/NoData';
import CardPost from '../components/Post/CardPost';
import cookie from 'js-cookie';
import { PlaceHolderPosts } from '../components/Layout/PlaceHolderGroup';
import ProfileMenuTabs from '../components/Profile/ProfileMenuTabs';
import ProfileHeader from '../components/Profile/ProfileHeader';
import Followers from '../components/Profile/Followers';
import Following from '../components/Profile/Following';
import UpdateProfile from '../components/Profile/UpdateProfile';
import Settings from '../components/Profile/Settings';
import { PostDeleteToastr } from '../components/Layout/Toastr';

const ProfilePage = ({
  profile,
  followersLength,
  followingLength,
  userFollowStats,
  errorLoading,
  user, // _app pageProps.user = user
}) => {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showToastr, setShowToastr] = useState(false);

  const [activeItem, setActiveItem] = useState('profile');
  const handleItemClick = (clickedTab) => setActiveItem(clickedTab);

  const [loggedUserFollowStats, setUserFollowStats] = useState(userFollowStats);

  const socket = useRef();

  const ownAccount = profile.user._id === user._id;

  useEffect(() => {
    const getPosts = async () => {
      setLoading(true);

      try {
        const { username } = router.query;
        const res = await axios.get(
          `${baseUrl}/api/profile/posts/${username}`,
          {
            headers: { Authorization: cookie.get('token') },
          }
        );

        setPosts(res.data);
      } catch (error) {
        alert('Error Loading Posts');
      }

      setLoading(false);
    };
    getPosts();
  }, [router.query.username]);

  useEffect(() => {
    if (!socket.current) {
      socket.current = io(baseUrl);
    }

    if (socket.current) {
      // basic emit
      socket.current.emit('join', { userId: user._id });
    }
  }, [user._id]);

  useEffect(() => {
    showToastr && setTimeout(() => setShowToastr(false), 4000);
  }, [showToastr]);

  if (errorLoading) return <NoProfile />;

  return (
    <>
      {showToastr && <PostDeleteToastr />}
      {/* A grid can have its columns stack on-top of each other after reaching mobile breakpoints. */}
      <Grid stackable>
        <Grid.Row>
          <Grid.Column>
            <ProfileMenuTabs
              activeItem={activeItem}
              handleItemClick={handleItemClick}
              followersLength={followersLength}
              followingLength={followingLength}
              ownAccount={ownAccount}
              loggedUserFollowStats={loggedUserFollowStats}
            />
          </Grid.Column>
        </Grid.Row>
        <Grid.Row>
          <Grid.Column>
            {activeItem === 'profile' && (
              <>
                <ProfileHeader
                  profile={profile}
                  ownAccount={ownAccount}
                  loggedUserFollowStats={loggedUserFollowStats}
                  setUserFollowStats={setUserFollowStats}
                />
                {loading ? (
                  <PlaceHolderPosts />
                ) : posts.length > 0 ? (
                  posts.map((post) => (
                    <CardPost
                      socket={socket}
                      key={post._id}
                      post={post}
                      user={user}
                      setPosts={setPosts}
                      setShowToastr={setShowToastr}
                    />
                  ))
                ) : (
                  <NoProfilePosts />
                )}
              </>
            )}
            {activeItem === 'followers' && (
              <>
                <Followers
                  user={user}
                  profileUserId={profile.user._id}
                  loggedUserFollowStats={loggedUserFollowStats}
                  setUserFollowStats={setUserFollowStats}
                />
              </>
            )}
            {activeItem === 'following' && (
              <>
                <Following
                  user={user}
                  profileUserId={profile.user._id}
                  loggedUserFollowStats={loggedUserFollowStats}
                  setUserFollowStats={setUserFollowStats}
                />
              </>
            )}
            {activeItem === 'updateProfile' && (
              <>
                <UpdateProfile Profile={profile} />
              </>
            )}
            {activeItem === 'settings' && (
              <>
                <Settings newMessagePopup={user.newMessagePopup} />
              </>
            )}
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </>
  );
};

ProfilePage.getInitialProps = async (ctx) => {
  try {
    const { username } = ctx.query;
    const { token } = parseCookies(ctx);

    const res = await axios.get(`${baseUrl}/api/profile/${username}`, {
      headers: { Authorization: token },
    });

    const { profile, followersLength, followingLength } = res.data;

    return { profile, followersLength, followingLength };
  } catch (error) {
    return { errorLoading: true };
  }
};

export default ProfilePage;
