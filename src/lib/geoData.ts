export const PROVINCIAS_ESPANOLAS = [
  { id: "01", nombre: "Álava" }, { id: "02", nombre: "Albacete" }, { id: "03", nombre: "Alicante" }, 
  { id: "04", nombre: "Almería" }, { id: "05", nombre: "Ávila" }, { id: "06", nombre: "Badajoz" }, 
  { id: "07", nombre: "Baleares" }, { id: "08", nombre: "Barcelona" }, { id: "09", nombre: "Burgos" }, 
  { id: "10", nombre: "Cáceres" }, { id: "11", nombre: "Cádiz" }, { id: "12", nombre: "Castellón" }, 
  { id: "13", nombre: "Ciudad Real" }, { id: "14", nombre: "Córdoba" }, { id: "15", nombre: "A Coruña" }, 
  { id: "16", nombre: "Cuenca" }, { id: "17", nombre: "Girona" }, { id: "18", nombre: "Granada" }, 
  { id: "19", nombre: "Guadalajara" }, { id: "20", nombre: "Gipuzcoa" }, { id: "21", nombre: "Huelva" }, 
  { id: "22", nombre: "Huesca" }, { id: "23", nombre: "Jaén" }, { id: "24", nombre: "León" }, 
  { id: "25", nombre: "Lleida" }, { id: "26", nombre: "La Rioja" }, { id: "27", nombre: "Lugo" }, 
  { id: "28", nombre: "Madrid" }, { id: "29", nombre: "Málaga" }, { id: "30", nombre: "Murcia" }, 
  { id: "31", nombre: "Navarra" }, { id: "32", nombre: "Ourense" }, { id: "33", nombre: "Asturias" }, 
  { id: "34", nombre: "Palencia" }, { id: "35", nombre: "Las Palmas" }, { id: "36", nombre: "Pontevedra" }, 
  { id: "37", nombre: "Salamanca" }, { id: "38", nombre: "Santa Cruz de Tenerife" }, { id: "39", nombre: "Cantabria" }, 
  { id: "40", nombre: "Segovia" }, { id: "41", nombre: "Sevilla" }, { id: "42", nombre: "Soria" }, 
  { id: "43", nombre: "Tarragona" }, { id: "44", nombre: "Teruel" }, { id: "45", nombre: "Toledo" }, 
  { id: "46", nombre: "Valencia" }, { id: "47", nombre: "Valladolid" }, { id: "48", nombre: "Vizcaya" }, 
  { id: "49", nombre: "Zamora" }, { id: "50", nombre: "Zaragoza" }, { id: "51", nombre: "Ceuta" }, 
  { id: "52", nombre: "Melilla" }
].sort((a, b) => a.nombre.localeCompare(b.nombre));

export const getProvinciaPorCP = (cp: string): {id: string, nombre: string, capital?: string} | null => {
  if (!cp || cp.length < 2) return null;
  const dosPrimeros = cp.substring(0, 2);
  const provincia = PROVINCIAS_ESPANOLAS.find(p => p.id === dosPrimeros);
  
  if (!provincia) return null;

  const ultimosTres = cp.substring(2);
  let capital = "";
  
  const capitalesMap: {[key: string]: string} = {
    "01": "Vitoria-Gasteiz", "02": "Albacete", "03": "Alicante", "04": "Almería", "05": "Ávila",
    "06": "Badajoz", "07": "Palma de Mallorca", "08": "Barcelona", "09": "Burgos", "10": "Cáceres",
    "11": "Cádiz", "12": "Castellón de la Plana", "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña",
    "16": "Cuenca", "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Donostia-San Sebastián",
    "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León", "25": "Lleida", "26": "Logroño",
    "27": "Lugo", "28": "Madrid", "29": "Málaga", "30": "Murcia", "31": "Pamplona", "32": "Ourense",
    "33": "Oviedo", "34": "Palencia", "35": "Las Palmas de Gran Canaria", "36": "Pontevedra",
    "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Santander", "40": "Segovia",
    "41": "Sevilla", "42": "Soria", "43": "Tarragona", "44": "Teruel", "45": "Toledo",
    "46": "Valencia", "47": "Valladolid", "48": "Bilbao", "49": "Zamora", "50": "Zaragoza",
    "51": "Ceuta", "52": "Melilla"
  };

  if (parseInt(ultimosTres, 10) <= 8 || cp.endsWith("000") || cp === "07001" || cp === "07002") {
    capital = capitalesMap[dosPrimeros] || "";
  }

  return { ...provincia, capital };
};
