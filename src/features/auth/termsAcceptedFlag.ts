/** Simple flag to signal that the user pressed "קראתי ואני מאשר/ת" in the terms page */
let _accepted = false;

export function setTermsAcceptedFlag() { _accepted = true; }
export function consumeTermsAcceptedFlag(): boolean {
  const val = _accepted;
  _accepted = false;
  return val;
}
