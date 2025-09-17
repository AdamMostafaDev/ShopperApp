declare module 'react-select-country-list' {
  interface CountryData {
    value: string;
    label: string;
  }

  interface CountryList {
    getData(): CountryData[];
    getLabel(value: string): string;
    getValue(label: string): string;
    getValueList(): string[];
    getLabelList(): string[];
    getValueByLabel(label: string): string;
    getLabelByValue(value: string): string;
  }

  function countryList(): CountryList;

  export default countryList;
}