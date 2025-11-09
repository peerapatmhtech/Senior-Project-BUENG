              </div>
              <div className="match-text">
                <h1>ITS A MATCH!</h1>
                <p>
                  You and{" "}
                  {matchedRoom.email !== userEmail
                    ? matchedRoom.email
                    : matchedRoom.usermatch}{" "}
                  liked each other
                </p>
              </div>
              <div className="match-users">
                <div className="user-avatar">
                  <img
                    src={getFullImageUrl(
                      getHighResPhoto(
                        users.find((u) => u.email === userEmail)?.photoURL
                      )
                    )}
                    alt="Your Avatar"
                  />
                </div>
                <FaHeart className="match-heart" />
                <div className="user-avatar">
                  <img
                    src={
                      getFullImageUrl(
                        getHighResPhoto(
                          users.find(
                            (u) =>
                              u.email ===
                              (matchedRoom.email !== userEmail
                                ? matchedRoom.email
                                : matchedRoom.usermatch)
                          )?.photoURL
                        )
                      ) || "https://via.placeholder.com/80"
                    }
                    alt={
                      matchedRoom.email !== userEmail
                        ? matchedRoom.email
                        : matchedRoom.usermatch
                    }
                  />