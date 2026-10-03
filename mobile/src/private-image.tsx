import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useSession } from "./session";
import { colors } from "./ui";

// Draft and private project images need the bearer token; <Image source={{ uri, headers }}> sends it.
export function PrivateImage({ path, ratio = 4 / 3 }: { path: string; ratio?: number }) {
  const { client } = useSession();
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    let live = true;
    client.imageHeaders().then((h) => live && setHeaders(h));
    return () => {
      live = false;
    };
  }, [client, path]);
  return (
    <View style={[styles.frame, { aspectRatio: ratio }]}>
      {headers ? <Image source={{ uri: client.absolute(path), headers }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ frame: { width: "100%", borderRadius: 12, overflow: "hidden", backgroundColor: colors.brandSoft } });
