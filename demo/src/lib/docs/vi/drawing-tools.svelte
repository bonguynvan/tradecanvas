<svelte:head>
  <title>Công cụ vẽ — Tài liệu TradeCanvas</title>
  <meta name="description" content="40 công cụ vẽ có sẵn: đường xu hướng, kênh và quạt Fibonacci, Pitchfork Schiff, mô hình harmonic, Gann, sóng Elliott, Hồ sơ khối lượng theo khoảng, Vị thế Long/Short và nhiều công cụ khác." />
</svelte:head>

<h1>Công cụ vẽ</h1>
<p>40 công cụ vẽ có sẵn. Mọi công cụ đều hỗ trợ hút vào giá, hoàn tác/làm lại và tuần tự hoá đầy đủ sang JSON.</p>

<h2>Kích hoạt một công cụ</h2>
<pre><code>{`chart.activateDrawingTool('trendLine')
// User clicks two points; the drawing is added to the manager.`}</code></pre>

<h2>Fibonacci tự động</h2>
<p>
  Một cú bấm là vẽ xong Fibonacci thoái lui trên con sóng chính (đỉnh và đáy cực trị)
  trong khoảng đang hiện — neo từ đáy→đỉnh với sóng tăng, từ đỉnh→đáy
  với sóng giảm. Chạy từ bảng lệnh ("Fibonacci tự động"), hoặc
  bằng code:
</p>
<pre><code>{`chart.autoFib()  // returns the new drawing id, or null if no clear swing

// general drawing append (active style applied, id auto-assigned)
chart.addDrawing({ type: 'fibRetracement', anchors: [a, b] })`}</code></pre>

<h2>Danh mục</h2>

<h3>Đường</h3>
<ul>
  <li><code>trendLine</code></li>
  <li><code>ray</code></li>
  <li><code>extendedLine</code></li>
  <li><code>horizontalLine</code></li>
  <li><code>horizontalRay</code> — giống <code>horizontalLine</code>, nhưng chỉ kéo dài về phía tương lai tính từ điểm neo.</li>
  <li><code>verticalLine</code></li>
  <li><code>crossLine</code> — một đường ngang và một đường dọc đi qua cùng một điểm (bấm một lần).</li>
  <li><code>infoLine</code> — đường xu hướng kèm hộp thống kê: thay đổi giá và %, số nến và thời gian trải qua, góc.</li>
  <li><code>trendAngle</code> — đường xu hướng hiển thị góc của nó trên màn hình, tính bằng độ.</li>
</ul>

<h3>Kênh</h3>
<ul>
  <li><code>parallelChannel</code></li>
  <li><code>regressionChannel</code></li>
</ul>

<h3>Hình</h3>
<ul>
  <li><code>rectangle</code></li>
  <li><code>ellipse</code></li>
  <li><code>triangle</code></li>
  <li><code>circle</code> — điểm tâm, rồi một điểm trên đường tròn.</li>
</ul>

<h3>Fibonacci</h3>
<ul>
  <li><code>fibRetracement</code></li>
  <li><code>fibExtension</code></li>
  <li><code>fibTimeZones</code> — các đường dọc chiếu các khoảng Fibonacci từ một khoảng thời gian giữa hai điểm neo.</li>
  <li><code>fibChannel</code> — A→B là đường xu hướng gốc, C đặt độ rộng; các đường song song nằm ở các tỉ lệ Fibonacci của độ rộng đó.</li>
  <li><code>fibSpeedResistanceFan</code> — các tia từ A đi qua các tỉ lệ Fibonacci của nhịp A→B, theo cả giá và thời gian.</li>
</ul>

<h3>Nâng cao</h3>
<ul>
  <li><code>pitchfork</code> — Pitchfork Andrews.</li>
  <li><code>schiffPitchfork</code> — đường trung tuyến bắt đầu ở nửa quãng giá từ A đến B, tại thời điểm của A.</li>
  <li><code>modifiedSchiffPitchfork</code> — đường trung tuyến bắt đầu tại trung điểm của A và B.</li>
  <li><code>cyclicLines</code> — các đường dọc lặp lại theo khoảng A→B.</li>
  <li><code>gannFan</code></li>
  <li><code>gannBox</code></li>
  <li><code>anchoredVWAP</code></li>
  <li><code>volumeProfileRange</code></li>
</ul>

<h3>Mô hình</h3>
<ul>
  <li><code>xabcdPattern</code> — XABCD harmonic (Gartley, Bat, Butterfly, Crab…) có ghi nhãn các tỉ lệ XB, AC, BD và XD.</li>
  <li><code>abcdPattern</code> — ABCD kèm tỉ lệ BC/AB và CD/BC.</li>
  <li><code>headAndShoulders</code> — bảy điểm pivot, đường viền cổ vẽ qua cả hai điểm cổ.</li>
  <li><code>elliottWave</code> — đếm sóng 1-2-3-4-5-A-B-C.</li>
</ul>

<h3>Đo lường</h3>
<ul>
  <li><code>measure</code></li>
  <li><code>priceRange</code></li>
  <li><code>dateRange</code></li>
  <li><code>dateAndPriceRange</code> — một hộp đo cùng lúc thay đổi giá, số nến, thời gian và khối lượng giao dịch.</li>
</ul>

<h3>Chú thích</h3>
<ul>
  <li><code>text</code></li>
  <li><code>arrow</code></li>
  <li><code>priceLabel</code> — nhãn chú thích ghim vào một điểm, hiện giá tại điểm đó (hoặc <code>style.text</code>).</li>
</ul>

<h3>Vị thế</h3>
<ul>
  <li><code>riskReward</code> — "Vị thế Long/Short": kéo từ điểm vào lệnh đến điểm dừng lỗ; hướng lệnh và vùng rủi ro/lợi nhuận được tô màu (mặc định 2:1) được tính tự động.</li>
</ul>

<h2>Tuần tự hoá</h2>
<pre><code>{`const json = chart.serialize()              // → string
chart.deserialize(json)                     // validates + restores drawings/indicators/viewport`}</code></pre>

<p>
  <code>deserialize</code> lọc bỏ các hình vẽ, lệnh và chỉ báo sai định dạng —
  dữ liệu thiếu hoặc bị hỏng không còn làm hỏng biểu đồ.
</p>
