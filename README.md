# highstock-smi-indicator
Stochastic Momentum Index Indicator (SMI) for Highstock 6

Use it as you are using any other indicators.

Also you'll need to add plotLines to yAxis: 

    plotLines: [
        // Over Bought line
        {
            color: 'red',
            value: 40,
            width: 1,
        },
        // Zero line
        {
            color: 'blue',
            value: 0,
            width: 1,
        },
        // Over Sold line
        {
            color: 'green',
            value: -40,
            width: 1,
        }
    ]
   
Other options are the same as in stochastic indicator.