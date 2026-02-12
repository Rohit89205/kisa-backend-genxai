import axios from 'axios';

const getStateDistrict = async (lat: number, lon: number) => {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;

  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'MyGeocodingApp/1.0' },
  });

  return {
    state: data?.address?.state || null,
    district:
      data?.address?.district ||
      data?.address?.county ||
      data?.address?.state_district ||
      null,
    village:
      data?.address?.city ||
      data?.address?.town ||
      data?.address?.village ||
      data?.address?.hamlet ||
      data?.address?.municipality ||
      data?.address?.suburb ||
      null,
    pincode: data?.address?.postcode || null,
  };
}
export {
    getStateDistrict
}