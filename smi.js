/**
 *
 * SMI Indicator type for Highstock
 * Based on https://tradingview.com/script/xd8t6hai-Stochastic-Momentum-Index-UCSgears/
 *
 * (c) 2018 Dmitriy Burlakov
 * https://github.com/tantacula
 *
 */
'use strict';
(function (factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory;
    } else if (typeof define === 'function' && define.amd) {
        define(function () {
            return factory;
        });
    } else {
        factory(Highcharts);
    }
}(function (Highcharts) {
    (function (H) {
        var each = H.each,
            merge = H.merge,
            isArray = H.isArray,
            defined = H.defined,
            EMA = H.seriesTypes.ema;

        // Utils:
        function minInArray(arr, index) {
            return H.reduce(arr, function (min, target) {
                return Math.min(min, target[index]);
            }, Infinity);
        }

        function maxInArray(arr, index) {
            return H.reduce(arr, function (min, target) {
                return Math.max(min, target[index]);
            }, 0);
        }

        H.seriesType('smi', 'sma',
            /**
             * Stochastic Momentum Index. This series requires the `linkedTo` option to be
             * set and should be loaded after the `stock/indicators/indicators.js` file.
             *
             * @extends plotOptions.sma
             * @product highstock
             * @sample {highstock} stock/indicators/smi
             *                     Stochastic Momentum Index
             * @since 6.0.0
             * @optionparent plotOptions.smi
             */
            {
                name: 'Stochastic Momentum Index (5, 3)',
                /**
                 * @excluding index,period
                 */
                params: {
                    /**
                     * Periods for Stochastic momentum index: [%K, %D].
                     *
                     * @default [5, 3]
                     * @type {Array}
                     * @since 6.0.0
                     * @product highstock
                     */
                    periods: [5, 3],
                    /**
                     * Over Bought line params
                     *
                     * not implemented
                     */
                    /*overbought: {
                     lineColor: 'red',
                     value: 40,
                     width:1,
                     },
                     /!**
                     * Over Sold line params
                     *!/
                     oversold: {
                     lineColor: 'green',
                     value: -40,
                     width:1,
                     },
                     /!**
                     * Zero line params
                     *!/
                     zeroline: {
                     color: 'blue',
                     width: 1,
                     },*/
                },
                marker: {
                    enabled: false
                },
                tooltip: {
                    pointFormat: '<span style="color:{point.color}">\u25CF</span><b> {series.name}</b><br/>%K: {point.y}<br/>%D: {point.smoothed}<br/>'
                },
                /**
                 * Smoothed line options.
                 *
                 * @since 6.0.0
                 * @product highstock
                 */
                smoothedLine: {
                    /**
                     * Styles for a smoothed line.
                     *
                     * @since 6.0.0
                     * @product highstock
                     */
                    styles: {
                        /**
                         * Pixel width of the line.
                         *
                         * @type {Number}
                         * @since 6.0.0
                         * @product highstock
                         */
                        lineWidth: 1,
                        /**
                         * Color of the line. If not set, it's inherited from
                         * [plotOptions.smi.color](
                         * #plotOptions.smi.color).
                         *
                         * @type {String}
                         * @since 6.0.0
                         * @product highstock
                         */
                        lineColor: undefined
                    }
                },
                dataGrouping: {
                    approximation: 'averages'
                }
            }, /** @lends Highcharts.Series.prototype */ {
                nameComponents: ['periods'],
                nameBase: 'SMI',
                pointArrayMap: ['y', 'smoothed'],
                parallelArrays: ['x', 'y', 'smoothed'],
                pointValKey: 'y',
                init: function () {
                    EMA.prototype.init.apply(this, arguments);

                    // Set default color for lines:
                    this.options = merge({
                        smoothedLine: {
                            styles: {
                                lineColor: this.color
                            }
                        }
                    }, this.options);
                },
                toYData: function (point) {
                    return [point.y, point.smoothed];
                },
                translate: function () {
                    var indicator = this;

                    EMA.prototype.translate.apply(indicator);

                    each(indicator.points, function (point) {
                        if (point.smoothed !== null) {
                            point.plotSmoothed = indicator.yAxis.toPixels(
                                point.smoothed,
                                true
                            );
                        }
                    });
                },
                drawGraph: function () {
                    var indicator = this,
                        mainLinePoints = indicator.points,
                        pointsLength = mainLinePoints.length,
                        mainLineOptions = indicator.options,
                        mainLinePath = indicator.graph,
                        gappedExtend = {
                            options: {
                                gapSize: mainLineOptions.gapSize
                            }
                        },
                        smoothing = [],
                        point;

                    // Generate points for %K and %D lines:
                    while (pointsLength--) {
                        point = mainLinePoints[pointsLength];
                        smoothing.push({
                            plotX: point.plotX,
                            plotY: point.plotSmoothed,
                            isNull: !defined(point.plotSmoothed)
                        });
                    }

                    // Modify options and generate smoothing line:
                    indicator.points = smoothing;
                    indicator.options = merge(
                        mainLineOptions.smoothedLine.styles,
                        gappedExtend
                    );
                    indicator.graph = indicator.graphSmoothed;
                    EMA.prototype.drawGraph.call(indicator);
                    indicator.graphSmoothed = indicator.graph;

                    // Restore options and draw a main line:
                    indicator.points = mainLinePoints;
                    indicator.options = mainLineOptions;
                    indicator.graph = mainLinePath;
                    EMA.prototype.drawGraph.call(indicator);
                },
                getValues: function (series, params) {
                    let periodK = params.periods[0],
                        periodD = params.periods[1],
                        xVal = series.xData,
                        yVal = series.yData,
                        yValLen = yVal ? yVal.length : 0,
                        high = 1,
                        low = 2,
                        close = 3;

                    if (yValLen < periodK || !isArray(yVal[0])) {
                        return false;
                    }

                    let diffs = [];
                    let rdiffs = [];
                    for (let i = periodK - 1; i < yValLen; i++) {
                        let slicedY = yVal.slice(i - periodK + 1, i + 1);

                        // Calculate %K
                        let LL = minInArray(slicedY, low); // Lowest low in %K periods
                        let HH = maxInArray(slicedY, high);
                        let diff = HH - LL;
                        let rdiff = yVal[i][close] - (HH + LL) / 2;

                        diffs.push({
                            x: xVal[i],
                            value: diff,
                        });
                        rdiffs.push({
                            x: xVal[i],
                            value: rdiff,
                        });
                    }


                    let avgrel = EMA.prototype.getValues.call(this,
                        EMA.prototype.getValues.call(this, {
                            values: rdiffs.map(item => {
                                return [item.x, item.value];
                            }),
                            xData: rdiffs.map(item => {
                                return item.x;
                            }),
                            yData: rdiffs.map(item => {
                                return item.value;
                            })
                        }, {
                            period: periodD
                        }), {
                            period: periodD
                        }
                    );

                    let avgdiff = EMA.prototype.getValues.call(this,
                        EMA.prototype.getValues.call(this, {
                            values: diffs.map(item => {
                                return [item.x, item.value];
                            }),
                            xData: diffs.map(item => {
                                return item.x;
                            }),
                            yData: diffs.map(item => {
                                return item.value;
                            })
                        }, {
                            period: periodD
                        }), {
                            period: periodD
                        }
                    );

                    let SMI = {values: [], xData: [], yData: []};

                    for (let i = 0; i < avgrel.values.length; i++) {
                        let SMIVal;
                        if (!avgrel.values[i][1] || !avgdiff.values[i][1]) {
                            SMIVal = 0;
                        } else {
                            SMIVal = (avgrel.values[i][1] !== 0 && avgrel.values[i][1] !== 0) ? (avgrel.values[i][1] / (avgdiff.values[i][1] / 2) * 100) : 0;
                        }

                        SMI['values'].push([avgrel.values[i][0], SMIVal, null]);
                        SMI['xData'].push(avgrel.values[i][0]);
                        SMI['yData'].push([SMIVal, null]);
                    }

                    let smoothed = EMA.prototype.getValues.call(this, SMI, {
                        period: periodD
                    });

                    SMI.values.forEach((item, i) => {
                        let index = smoothed.xData.indexOf(item[0]);
                        if (index !== -1) {
                            SMI.values[i][2] = smoothed.values[index][1];
                            SMI.yData[i][1] = smoothed.values[index][1];
                        }
                    });

                    return SMI;
                }
            }
        );

        /**
         * A Stochastic Momentum Index. If the [type](#series.smi.type) option is not
         * specified, it is inherited from [chart.type](#chart.type).
         *
         * @type {Object}
         * @since 6.0.0
         * @extends series,plotOptions.smi
         * @excluding data,dataParser,dataURL
         * @product highstock
         * @apioption series.smi
         */

        /**
         * An array of data points for the series. For the `smi` series type,
         * points are calculated dynamically.
         *
         * @type {Array<Object|Array>}
         * @since 6.0.0
         * @extends series.line.data
         * @product highstock
         * @apioption series.smi.data
         */


    }(Highcharts));
    return (function () {


    }());
}));