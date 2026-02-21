from flask import Flask, render_template
 
app = Flask(__name__)
 
@app.route('/')
def home():
    return render_template('index.html')
 
@app.route('/solar-system')
def solar_system():
    return render_template('solar_system.html')
 
@app.route('/universe')
def universe():
    return render_template('universe.html')
 
if __name__ == '__main__':
    app.run(debug=True)
