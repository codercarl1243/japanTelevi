import Player from "./player";
import getAppData from "./data/data-controller";

export default async function Home() {

  const { programmes, streams } = await getAppData();

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Japan IPTV Streams</h1>
      <Player streams={streams} programmes={programmes} />
    </main>
  );
}