import React from "react";

import _ from "lodash";

import { Dialog } from "@mui/material";

import { SimpleDialogProps } from "../src/types.ts";

import "./styles.css";

export default function ChangeAvatarDialog(props: SimpleDialogProps) {
  const { onClose, openDialogState, avatars, changeProfileImage } = props;

  return (
    <Dialog onClose={onClose} open={openDialogState}>
      <div style={{ margin: 30 }}>
        <h3
          style={{
            fontFamily: "Roboto, sans-serif",
            margin: 0,
            marginBottom: 20
          }}
        >
          Select new profile image
        </h3>

        <div style={{ display: "flex" }}>
          {_.uniqWith(avatars, _.isEqual).map((rA: string, index: number) => {
            const url = `https://robohash.org/${rA}?set=set4`;
            return (
              <img
                src={url}
                alt=""
                key={index}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  objectFit: "cover"
                }}
                className="paddingAvatars"
                onClick={() => {
                  changeProfileImage(url);
                }}
              />
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}
