import React, { useState, useEffect } from 'react';
import { Button, Image, List } from 'semantic-ui-react';
import axios from 'axios';
import cookie from 'js-cookie';
import baseUrl from '../../utils/baseUrl';
import { followUser, unfollowUser } from '../../utils/profileActions';
import { NoFollowData } from '../Layout/NoData';
import Spinner from '../Layout/Spinner';

const Followers = ({
  user,
  loggedUserFollowStats,
  setUserFollowStats,
  profileUserId,
}) => {
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const getFollowers = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${baseUrl}/api/profile/followers/${profileUserId}`,
          {
            headers: { Authorization: cookie.get('token') },
          }
        );

        setFollowers(res.data);
      } catch (error) {
        alert('Error Loading Followers');
      }
      setLoading(false);
    };

    getFollowers();
  }, [profileUserId]);

  return (
    <>
      {loading ? (
        <Spinner />
      ) : followers.length > 0 ? (
        followers.map((profileFollower) => {
          /*  */
          const isFollowing =
            loggedUserFollowStats.following.length > 0 &&
            loggedUserFollowStats.following.filter(
              (following) => following.user === profileFollower.user._id
            ).length > 0;
          /*  */
          return (
            <List key={profileFollower.user._id} divided verticalAlign="middle">
              <List.Item>
                <List.Content floated="right">
                  {profileFollower.user._id !== user._id && (
                    <Button
                      color={isFollowing ? 'instagram' : 'twitter'}
                      icon={isFollowing ? 'check' : 'add user'}
                      content={isFollowing ? 'Following' : 'Follow'}
                      disabled={followLoading}
                      onClick={() => {
                        setFollowLoading(true);

                        isFollowing
                          ? unfollowUser(
                              profileFollower.user._id,
                              setUserFollowStats
                            )
                          : followUser(
                              profileFollower.user._id,
                              setUserFollowStats
                            );

                        setFollowLoading(false);
                      }}
                    />
                  )}
                </List.Content>
                <Image avatar src={profileFollower.user.profilePicUrl} alt="" />
              </List.Item>
              <List.Content as="a" href={`/${profileFollower.user.username}`}>
                {profileFollower.user.name}
              </List.Content>
            </List>
          );
        })
      ) : (
        <NoFollowData followersComponent={true} />
      )}
    </>
  );
};

export default Followers;
