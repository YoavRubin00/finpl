/**
 * SafeLottieView — Native passthrough
 *
 * On native platforms, simply re-export the real LottieView.
 * The metro resolver only redirects web imports to this module's
 * .web.tsx variant; native imports come here and get the real thing.
 */
export { default } from "lottie-react-native";
