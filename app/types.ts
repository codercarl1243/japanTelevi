import type { Dispatch, RefObject, SetStateAction } from "react";
import type { FilterKey } from "./player/filters";

export type Channel = {
  id: string;
  name: string;
  country: string;
  is_nsfw: boolean;
};

export type Stream = {
  channel: string | null;
  url: string;
  status?: string;
  title?: string;
};

export type Guide = {
  channel: string | null;
  feed: string | null;
  site: string;
  site_id: string;
  site_name: string;
  lang: string;
}

export type StreamItem = {
  channelId: string;
  channelName: string;
  streamTitle: string | null;
  url: string;
  status: string | null;
  site_id: string;
};

export type Programme = {
  channel: string;
  title: string;
  desc: string | null;
  start: Date;
  stop: Date;
};

export type AppData = {
  channels: Channel[];
  streams: StreamItem[];
  programmes: Programme[];
  availableFilters: FilterKey[];
};

export type VideoPlayerProps = {
  streams: StreamItem[];
  programmes: Programme[];
  current: StreamItem | null;
  setCurrent: Dispatch<SetStateAction<StreamItem | null>>;
  videoRef: RefObject<HTMLDivElement | null>;
  skip: (seconds: number) => void;
  availableFilters: AppData['availableFilters'];
}