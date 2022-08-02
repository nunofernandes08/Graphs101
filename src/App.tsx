import React, { useEffect, useState } from "react";

import axios from "axios";
import cytoscape from "cytoscape";
import Graph from "graph-data-structure";
import _ from "lodash";

import { Grid, Box, TextField } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";

import ChangeAvatarDialog from "../src/dialog";

import cover from "../src/images/cover.jpeg";
import dots from "../src/images/dots.png";
import refreshIcon from "../src/images/refresh.png";

import {
  User,
  Node,
  Relation,
  ShortestPath,
  MyNode,
  ShortestPathItem,
  RelationsItem
} from "../src/types.ts";

import { useCommonStyles } from "../src/styleCommon.ts";
import "./styles.css";

const baseUrlUsers = "https://random-data-api.com/api/users/random_user?size=5";

export default function App() {
  const graph = new Graph();
  const nodes: Node[] = [];

  const [users, setUsers] = useState<User[]>([]);
  const [graphDataVisualization, setGraphDataVisualization] = useState<
    MyNode[]
  >([]);
  const [shortestPath, setShortestPath] = useState<ShortestPath[]>([]);
  const [container, setContainer] = useState<HTMLElement | null>();
  const [loaded, sertLoaded] = useState<Boolean>(false);
  const [randomAvatars, setRandomAvatars] = useState<string[]>([]);
  const [openDialogState, setOpenDialogState] = useState<Boolean>(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedProfile, setSelectedProfile] = useState<User>();
  const [newUser, setNewUser] = useState<string>("");

  const cy = cytoscape({
    container: container,
    elements: graphDataVisualization,
    style: [
      // the stylesheet for the graph
      {
        selector: "node",
        style: {
          "background-color": "#666",
          label: "data(id)",
          color: "white"
        }
      },

      {
        selector: "edge",
        style: {
          width: 3,
          "line-color": "#ccc",
          "target-arrow-color": "#ccc",
          "target-arrow-shape": "triangle",
          "curve-style": "straight"
        }
      }
    ],
    layout: {
      name: "circle"
    },
    userZoomingEnabled: false,
    userPanningEnabled: false
  });

  const addNodesAndEdges = (items: User[]) => {
    items.map((u: User) => {
      return nodes.push({ name: u.name });
    });

    const myNodes: MyNode[] = [];

    nodes.map((n: Node) => {
      myNodes.push({
        group: "nodes",
        data: {
          id: n.name
        }
      });
      return graph.addNode(n.name);
    });

    graph.nodes().forEach((gN: Node) => {
      const index = items.findIndex((item) => item.name === gN);
      if (index !== -1) {
        if (items[index].friends) {
          items[index].friends.map((uT: User) => {
            return graph.addEdge(gN, uT.name);
          });
        }
      }
    });

    return myNodes;
  };

  const generateUsers = (usersData: User[], numberOfUsers: number) => {
    const randomUsers = _.sampleSize(usersData, numberOfUsers).map(
      (friend: User) => {
        return {
          id: friend.id,
          uid: friend.uid,
          name: friend.name,
          avatar: friend.avatar,
          email: friend.email,
          cover: cover,
          friends: friend.friends
        };
      }
    );

    return randomUsers;
  };

  const addMutualFriends = (relations: Relation[]) => {
    relations.map((item: Relation) => {
      relations.push({
        userId: item.friendId,
        friendId: item.userId
      });
    });

    //remover same users
    relations = relations.filter((item) => item.userId !== item.friendId);

    //remover same relations
    return _.uniqWith(relations, _.isEqual);
  };

  const addShortestPathToUsers = (
    users: User[],
    shortestPath: ShortestPathItem
  ) => {
    const allData = [];
    users.map((u: User) => {
      u.friends.map((uF: User) => {
        const index = shortestPath.findIndex(
          (sP: ShortestPathItem) => sP.issuer === uF.name
        );
        shortestPath.map((sP: ShortestPathItem) => {
          if (index !== -1 && sP.shortestPath) {
            allData.push({
              id: uF.id,
              uid: uF.uid,
              name: uF.name,
              avatar: uF.avatar,
              email: uF.email,
              cover: uF.cover,
              shortestPath: {
                issuer: sP.issuer,
                receiver: sP.receiver,
                shortestPath: sP.shortestPath
              }
            });
          }
        });
      });
    });
  };

  const findShortestPath = (relations: Relation[], finalUsers: User[]) => {
    const finalData: ShortestPathItem[] = [];

    relations.map((r: Relation) => {
      const userIndex = finalUsers.findIndex((item) => item.id === r.userId);

      const friendIndex = finalUsers.findIndex(
        (item) => item.id === r.friendId
      );

      finalUsers[friendIndex].friends.map((fFF: User) => {
        if (r.userId === fFF.id) return;

        if (finalUsers[userIndex]) {
          const shortestPath = graph.shortestPath(
            finalUsers[userIndex].name,
            fFF.name
          );

          finalData.push({
            issuer: finalUsers[userIndex].name,
            receiver: fFF.name,
            shortestPath: shortestPath.filter(
              (item: string) =>
                item !== finalUsers[userIndex].name && item !== fFF.name
            ).length
          });

          setShortestPath([...finalData]);
        }
      });

      addShortestPathToUsers(finalUsers, finalData);
    });
  };

  const addEdgesToVisualization = (
    myNodes: any,
    finalUsers: User[],
    relations: Relation[]
  ) => {
    const allData = myNodes;

    relations.map((rA, index) => {
      const userIdIndex = finalUsers.findIndex((item) => item.id === rA.userId);
      const friendIdIndex = finalUsers.findIndex(
        (item) => item.id === rA.friendId
      );

      allData.push({
        group: "edges",
        data: {
          id: `e${index}`,
          source: finalUsers[userIdIndex].name,
          target: finalUsers[friendIdIndex].name
        }
      });
    });

    return allData;
  };

  const generateAvatarsToChangeProfile = () => {
    const avatarArray = [];
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i <= 4; i++) {
      avatarArray.push(
        possible.charAt(Math.floor(Math.random() * possible.length))
      );
    }
    setRandomAvatars([...avatarArray]);
  };

  const getUsers = async () => {
    const usersResult = await axios.get(baseUrlUsers + "/posts").then((res) => {
      return res.data;
    });

    const usersData = usersResult.map((user: User) => {
      return {
        id: user.id,
        uid: user.uid,
        name: `${user.first_name} ${user.last_name}`,
        avatar: user.avatar,
        email: user.email,
        cover: cover
      };
    });

    let userDataClone = usersData;
    let relations: RelationsItem[] = [];

    userDataClone.forEach((uD: User, uDIndex: number) => {
      const randomNumber = Math.floor(Math.random() * (3 + 1));
      const generatedFriends = generateUsers(
        userDataClone,
        randomNumber
      ).filter((gF: any) => gF !== undefined);

      generatedFriends.map((gF: User) => {
        relations.push({
          userId: uD.id,
          friendId: gF.id
        });
      });
    });

    relations = addMutualFriends(relations);

    const finalUsers = userDataClone.map((uDC: User) => ({
      id: uDC.id,
      uid: uDC.uid,
      name: uDC.name,
      avatar: uDC.avatar,
      email: uDC.email,
      cover: uDC.cover,
      friends: relations
        .map((r) => {
          if (r.userId === uDC.id) {
            const friendIndex = userDataClone.findIndex(
              (item: User) => item.id === r.friendId
            );
            return {
              id: userDataClone[friendIndex].id,
              uid: userDataClone[friendIndex].uid,
              name: userDataClone[friendIndex].name,
              avatar: userDataClone[friendIndex].avatar,
              email: userDataClone[friendIndex].email,
              cover: userDataClone[friendIndex].cover
            };
          }
        })
        .filter((item) => item !== undefined)
    }));

    setUsers(finalUsers);

    const visualizationNodes = addNodesAndEdges(finalUsers);

    const visualizationData = addEdgesToVisualization(
      visualizationNodes,
      finalUsers,
      relations
    );

    setGraphDataVisualization(visualizationData);

    findShortestPath(relations, finalUsers);

    setTimeout(() => {
      sertLoaded(true);
    }, 100);

    generateAvatarsToChangeProfile();

    setSelectedProfile(finalUsers[0]);
  };

  const openDialog = (userId: string) => {
    if (selectedProfile.id !== userId) return;
    setOpenDialogState(true);
    setSelectedUser(userId);
  };

  const closeDialog = (value: string) => {
    setOpenDialogState(false);
  };

  const changeProfileImage = (avatar: string) => {
    users.forEach((item: User) => {
      if (item.id === selectedUser) {
        item.avatar = avatar;
        setOpenDialogState(false);
      }
    });
  };

  useEffect(() => {
    const myContainer = document.getElementById("cyContainer");
    setContainer(myContainer);
    getUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loaded) {
      getUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  useEffect(() => {
    const myUser = users.find((item) => item.name === newUser);
    setSelectedProfile(myUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newUser]);

  return (
    <Box className="App">
      <Box
        style={{
          display: "flex",
          justifyContent: "flex-end",
          backgroundColor: "rgb(96, 103, 112)",
          borderRadius: useCommonStyles.Px15,
          padding: useCommonStyles.Px15,
          marginLeft: useCommonStyles.Px10,
          marginRight: useCommonStyles.Px10
        }}
      >
        <Grid item xs={12} style={{ width: "100%" }}>
          <Box display="flex" justifyContent="center" alignItems="center">
            <Grid item xs={6} style={{ width: "50%" }}>
              <Box>
                {selectedProfile && (
                  <Box display="flex">
                    <img
                      src={selectedProfile.avatar}
                      alt=""
                      style={{
                        width: useCommonStyles.Px60,
                        height: useCommonStyles.Px60,
                        borderRadius: "50%",
                        objectFit: "cover",
                        cursor: "pointer"
                      }}
                      onClick={() => {
                        openDialog(selectedProfile.id);
                      }}
                    />

                    <Box
                      display="flex"
                      justifyContent="center"
                      flexDirection="column"
                      style={{
                        marginLeft: useCommonStyles.Px15
                      }}
                    >
                      <span>{selectedProfile.name}</span>
                      <span
                        style={{
                          fontSize: useCommonStyles.Px13
                        }}
                      >
                        {selectedProfile.email}
                      </span>
                    </Box>
                  </Box>
                )}
              </Box>
            </Grid>
            <Grid item xs={6} style={{ width: "50%" }}>
              <Box display="flex" justifyContent="flex-end" alignItems="center">
                <Autocomplete
                  disablePortal
                  id="combo-box-demo"
                  options={users}
                  sx={{ width: 300 }}
                  getOptionLabel={(option) => option.name}
                  renderOption={(props, option) => (
                    <Box
                      component="li"
                      sx={{ "& > img": { mr: 2, flexShrink: 0 } }}
                      {...props}
                    >
                      <img
                        loading="lazy"
                        width={useCommonStyles.Px20}
                        src={option.avatar}
                        alt=""
                      />
                      {option.name}
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="User"
                      inputProps={{
                        ...params.inputProps
                      }}
                    />
                  )}
                  style={{ marginRight: useCommonStyles.Px30 }}
                  onInputChange={(event, newInputValue) => {
                    if (!newInputValue) return;
                    setNewUser(newInputValue);
                  }}
                />
                <img
                  src={refreshIcon}
                  alt=""
                  onClick={getUsers}
                  style={{
                    width: useCommonStyles.Px30,
                    height: useCommonStyles.Px30
                  }}
                />
              </Box>
            </Grid>
          </Box>
        </Grid>
      </Box>

      <Box>
        <Box
          display="flex"
          justifyContent="center"
          style={{
            width: "100%"
          }}
        >
          <Box
            display="flex"
            justifyContent="center"
            id="cyContainer"
            style={{
              height: "500px",
              width: "80%"
            }}
          ></Box>
        </Box>

        {users.map((user: User, userIndex: number) => {
          return (
            <Box
              key={userIndex}
              style={{
                border: "1px",
                margin: useCommonStyles.Px10,
                marginBottom: useCommonStyles.Px20,
                borderRadius: useCommonStyles.Px10,
                backgroundColor: "#3E4042"
              }}
            >
              <Box
                style={{
                  position: "relative",
                  backgroundImage: `url(${user.cover})`,
                  width: "100%",
                  height: 150,
                  opacity: 0.5,
                  borderTopRightRadius: useCommonStyles.Px10,
                  borderTopLeftRadius: useCommonStyles.Px10,
                  backgroundSize: "cover"
                }}
              ></Box>

              <Box
                display="flex"
                alignItems="center"
                style={{
                  padding: useCommonStyles.Px20,
                  width: "calc(100% - 58px)",
                  position: "absolute",
                  transform: "translate(0%, -50%)"
                }}
              >
                <Box>
                  <img
                    src={user.avatar}
                    alt=""
                    style={{
                      width: useCommonStyles.Px100,
                      height: useCommonStyles.Px100,
                      borderRadius: "50%",
                      objectFit: "cover",
                      cursor:
                        selectedProfile && selectedProfile.id === user.id
                          ? "pointer"
                          : ""
                    }}
                    onClick={() => {
                      openDialog(user.id);
                    }}
                  />
                </Box>
                <Box display="flex" style={{ width: "calc(100% - 160px)" }}>
                  <Box
                    style={{
                      width: "70%",
                      marginBottom: useCommonStyles.Px60,
                      marginLeft: useCommonStyles.Px20
                    }}
                  >
                    <Box>
                      <h4
                        style={{
                          margin: 0,
                          fontWeight: "bold",
                          fontSize: useCommonStyles.Px23
                        }}
                      >
                        {user.name}
                      </h4>
                    </Box>
                    <Box style={{ margin: 0 }}>
                      <h5 style={{ margin: 0, fontSize: useCommonStyles.Px16 }}>
                        {user.friends.length} amigo/s
                      </h5>
                    </Box>
                  </Box>
                  <Box
                    display="flex"
                    justifyContent="flex-end"
                    style={{
                      width: "30%"
                    }}
                  >
                    <img
                      src={dots}
                      alt=""
                      style={{
                        width: useCommonStyles.Px32,
                        height: useCommonStyles.Px32,
                        cursor: "pointer"
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              <Box
                style={{
                  margin: useCommonStyles.Px30,
                  marginTop: useCommonStyles.Px70
                }}
              >
                <Box style={{ paddingBottom: useCommonStyles.Px30 }}>
                  <h3 style={{ margin: 0 }}>Amigos</h3>

                  <Box display="flex" flexWrap="wrap">
                    {user.friends.map((fDD: User, indexFDD: number) => {
                      if (!fDD) return <Box key={indexFDD}> </Box>;
                      return (
                        <Box
                          display="flex"
                          alignItems="flex-start"
                          key={indexFDD}
                          style={{
                            width: "calc((100% / 2) - 62px)",
                            border: "1px solid #38393b",
                            borderRadius: useCommonStyles.Px8,
                            margin: useCommonStyles.Px10,
                            padding: useCommonStyles.Px20,
                            backgroundColor: "#606770"
                          }}
                        >
                          <img
                            src={fDD.avatar}
                            alt=""
                            style={{
                              width: useCommonStyles.Px80,
                              height: useCommonStyles.Px80,
                              borderRadius: "20%",
                              objectFit: "cover"
                            }}
                          />
                          <Box
                            display="flex"
                            alignItems="flex-start"
                            style={{
                              width: "calc(100% - 80px)"
                            }}
                          >
                            <Box
                              display="flex"
                              flexDirection="column"
                              style={{
                                width: "70%"
                              }}
                            >
                              <span
                                style={{ marginLeft: useCommonStyles.Px10 }}
                              >
                                {fDD.name}
                              </span>

                              <span
                                style={{
                                  marginLeft: useCommonStyles.Px10,
                                  marginTop: useCommonStyles.Px5,
                                  fontSize: useCommonStyles.Px13
                                }}
                              >
                                {fDD.email}
                              </span>
                              <span
                                style={{
                                  marginLeft: useCommonStyles.Px10,
                                  marginTop: useCommonStyles.Px5,
                                  fontSize: useCommonStyles.Px13
                                }}
                              >
                                {fDD.uid}
                              </span>

                              {_.uniqWith(shortestPath, _.isEqual).map(
                                (sP: ShortestPathItem, index: number) => {
                                  if (sP.issuer !== fDD.name)
                                    return <Box key={index}> </Box>;
                                  const shortestPathImageIndex = users.findIndex(
                                    (item) => item.name === sP.receiver
                                  );
                                  let shortestPathImage = "";

                                  if (shortestPathImageIndex !== -1) {
                                    shortestPathImage =
                                      users[shortestPathImageIndex].avatar;
                                  }

                                  return (
                                    <Box key={index}>
                                      {sP.shortestPath > 0 && (
                                        <Box
                                          display="flex"
                                          alignItems="center"
                                          style={{
                                            marginTop: useCommonStyles.Px20
                                          }}
                                        >
                                          <img
                                            src={shortestPathImage}
                                            alt=""
                                            style={{
                                              width: useCommonStyles.Px40,
                                              height: useCommonStyles.Px40,
                                              marginLeft: useCommonStyles.Px10
                                            }}
                                          />
                                          <span
                                            style={{
                                              marginLeft: useCommonStyles.Px10,
                                              fontSize: useCommonStyles.Px13
                                            }}
                                          >
                                            {sP.receiver} - {sP.shortestPath}
                                          </span>
                                        </Box>
                                      )}
                                    </Box>
                                  );
                                }
                              )}
                            </Box>

                            <Box
                              display="flex"
                              justifyContent="flex-end"
                              style={{
                                width: "30%"
                              }}
                            >
                              <img
                                src={dots}
                                alt=""
                                style={{
                                  width: useCommonStyles.Px32,
                                  height: useCommonStyles.Px32,
                                  cursor: "pointer"
                                }}
                              />
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>
            </Box>
          );
        })}

        <ChangeAvatarDialog
          openDialogState={openDialogState}
          onClose={closeDialog}
          avatars={randomAvatars}
          changeProfileImage={changeProfileImage}
        />
      </Box>
    </Box>
  );
}
