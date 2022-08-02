export interface User {
  id: number;
  uid: string;
  name: string;
  avatar: string;
  email: string;
  cover: string;
}

export interface Node {
  name: string;
}

export interface Relation {
  userId: number;
  friendId: number;
}

export interface ShortestPath {
  issuer: string;
  receiver: string;
  shortestPath: string[];
}

export interface SimpleDialogProps {
  open: boolean;
  onClose: (value: string) => void;
  avatars: string[];
  changeProfileImage: any;
}

export interface MyNode {
  group: string;
  data: {
    id: "string";
  };
}

export interface ShortestPathItem {
  issuer: string;
  receiver: string;
  shortestPath: number;
}

export interface RelationsItem {
  userId: string;
  friendId: string;
}
