import sys

with open('src/app/proyectos/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Replace lines 604-684 (1-indexed) => 603-683 (0-indexed)
# These are the table section + totals section

new_section = (
    '               <div className="mb-8 overflow-x-auto">\r\n'
    '                 <table className="w-full text-left min-w-[400px]">\r\n'
    '                   <thead>\r\n'
    '                     <tr>\r\n'
    '                       <th className="pb-3 text-[10px] font-bold text-gray-400 uppercase">Descripci\u00f3n / Partida</th>\r\n'
    '                       <th className="w-44 pb-3 text-[10px] font-bold text-gray-400 uppercase text-right">Importe</th>\r\n'
    '                       <th className="w-10"></th>\r\n'
    '                     </tr>\r\n'
    '                   </thead>\r\n'
    '                   <tbody>\r\n'
    '                     {lineas.map((linea, idx) => (\r\n'
    '                       <tr key={idx}>\r\n'
    '                         <td className="py-2 pr-4"><textarea rows={1} value={linea.descripcion} onChange={(e) => updateLinea(idx, { descripcion: e.target.value })} className="w-full p-2 rounded-lg border border-gray-100 text-sm" /></td>\r\n'
    '                         <td className="py-2 pr-4">\r\n'
    '                           <input\r\n'
    '                             type="text"\r\n'
    '                             inputMode="decimal"\r\n'
    '                             value={linea.precio_unitario === 0 ? \'\' : (linea.precio_unitario || \'\')}\r\n'
    '                             onChange={(e) => {\r\n'
    '                                const raw = e.target.value.replace(\',\', \'.\');\r\n'
    '                                if (raw === \'\' || /^\\d*\\.?\\d*$/.test(raw)) {\r\n'
    '                                  const val = raw === \'\' ? 0 : parseFloat(raw);\r\n'
    '                                  updateLinea(idx, { precio_unitario: isNaN(val) ? 0 : val });\r\n'
    '                                }\r\n'
    '                             }}\r\n'
    '                             onFocus={(e) => e.target.select()}\r\n'
    '                             className="w-full p-2 rounded-lg border border-gray-100 text-right font-mono text-gray-800 font-bold focus:ring-2 focus:ring-orange-100 outline-none"\r\n'
    '                             placeholder="0.00"\r\n'
    '                           />\r\n'
    '                         </td>\r\n'
    '                         <td className="py-2 text-center">{lineas.length > 1 && <button onClick={() => removeLinea(idx)} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>}</td>\r\n'
    '                       </tr>\r\n'
    '                     ))}\r\n'
    '                   </tbody>\r\n'
    '                 </table>\r\n'
    '                 <button onClick={addLinea} className="mt-4 flex items-center gap-2 text-sm font-bold text-orange-600 hover:underline"><Plus size={16}/> A\u00f1adir partida</button>\r\n'
    '               </div>\r\n'
    '\r\n'
    '               <div className="flex flex-col md:flex-row justify-between items-start pt-8 border-t border-gray-100 gap-8">\r\n'
    '                  <div className="w-full md:w-64">\r\n'
    '                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Retenci\u00f3n IRPF (%)</label>\r\n'
    '                    <select\r\n'
    '                      value={retencionPct}\r\n'
    '                      onChange={(e) => setRetencionPct(parseFloat(e.target.value) || 0)}\r\n'
    '                      className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-50 font-bold outline-none focus:bg-white transition-all"\r\n'
    '                    >\r\n'
    '                      <option value="0">Sin Retenci\u00f3n (0%)</option>\r\n'
    '                      {tiposIrpf.map(t => (\r\n'
    '                        <option key={t.id} value={t.valor}>{t.nombre} ({t.valor}%)</option>\r\n'
    '                      ))}\r\n'
    '                    </select>\r\n'
    '                  </div>\r\n'
    '                  <div className="w-full md:w-80 space-y-3">\r\n'
    '                    <div className="flex justify-between text-sm"><span>Base Imponible:</span><span className="font-mono font-bold">{formatCurrency(baseImponible)}</span></div>\r\n'
    '                    <div className="flex justify-between text-sm"><span>IVA (21%):</span><span className="font-mono font-bold">{formatCurrency(cuotaIva)}</span></div>\r\n'
    '                    {retencionPct > 0 && <div className="flex justify-between text-sm text-red-600"><span>Retenci\u00f3n ({retencionPct}%):</span><span className="font-mono font-bold">-{formatCurrency(retencionImporte)}</span></div>}\r\n'
    '                    <div className="flex justify-between text-xl font-bold pt-3 border-t-2 border-gray-200 text-gray-800"><span>TOTAL:</span><span className="text-orange-600">{formatCurrency(totalProyecto)}</span></div>\r\n'
    '                  </div>\r\n'
    '               </div>\r\n'
)

# Print current lines 604-684 to verify
print("Line 609 (should be Coste Est.):", repr(lines[608]))
print("Line 675 (should be costePrevisto):", repr(lines[674]))

# Replace lines 604-684 (1-indexed) = indices 603-683
new_lines = lines[:603] + [new_section] + lines[684:]

with open('src/app/proyectos/page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Done. New total lines: {len(new_lines)}")
